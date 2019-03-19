import { expect } from "chai";

import { timer } from "rxjs";

import { createModelBuilder, createReduxAdvancedStore } from "../lib";

interface IDependencies {
  appId: number;
}

const defaultModelBuilder = createModelBuilder()
  .dependencies<IDependencies>()
  .freeze();

describe("redux-advanced", () => {
  it("test", async () => {
    const testModelBuilder = defaultModelBuilder
      .props({
        name: ""
      })
      .state(({ props }) => ({
        name: props.name,
        age: 0
      }))
      .selectors({
        summary: ({ state }) => `${state.name} - ${state.age}`
      })
      .selectors((createSelector) => ({
        fullSummary: createSelector(
          ({ getters }) => getters.summary,
          (summary, { dependencies }) => `${dependencies.appId} - ${summary}`
        )
      }))
      .reducers({
        setName(state, payload: string) {
          state.name = payload;
        },
        setAge(state, payload: number) {
          state.age = payload;
        }
      })
      .effects({
        setName: async ({ actions, getState }, payload: string) => {
          return payload;
        }
      })
      .effects({
        setNameAsync: async ({ actions, getState }, payload: string) => {
          await timer(50).toPromise();
          getState(); // should throw error if container is unregistered
          await actions.setName.dispatch(payload);
        },
        setAgeAsync: async ({ getContainer }, payload: number) => {
          await timer(50).toPromise();
          await getContainer(staticModel).actions.setAge.dispatch(payload);
          return "" + payload;
        }
      })
      .freeze();

    const staticModel = testModelBuilder.build({
      name: "nyan"
    });

    const dynamicModel = testModelBuilder
      .selectors({
        staticSummary: ({ getContainer }) =>
          getContainer(staticModel).getters.summary
      })
      .build();

    const autoRegisteredDynamicModel = testModelBuilder.autoRegister().build();

    const appDependencies: IDependencies = { appId: 233 };

    const store = createReduxAdvancedStore(appDependencies, {
      staticModel,
      dynamicModels: [dynamicModel],
      autoRegisteredDynamicModel: [autoRegisteredDynamicModel]
    });
    const staticModelContainer = store.getContainer(staticModel);
    expect(staticModelContainer.namespace).eq("staticModel");

    expect(staticModelContainer.isRegistered).eq(true);
    expect(staticModelContainer.canRegister).eq(false);

    expect(staticModelContainer.state.name).eq("nyan");
    expect(staticModelContainer.getters.fullSummary).eq("233 - nyan - 0");

    staticModelContainer.actions.setAge.dispatch(998);
    expect(staticModelContainer.state.age).eq(998);

    const staticModelSetNamePromise = staticModelContainer.actions.setNameAsync.dispatch(
      "meow"
    );
    expect(staticModelContainer.state.name).eq("nyan");
    const staticModelSetNameResult = await staticModelSetNamePromise;
    expect(staticModelSetNameResult).eq(undefined);
    expect(staticModelContainer.state.name).eq("meow");

    const staticModelSetAgePromise = staticModelContainer.actions.setAgeAsync.dispatch(
      233
    );
    expect(staticModelContainer.state.age).eq(998);
    const staticModelSetAgeResult = await staticModelSetAgePromise;
    expect(staticModelSetAgeResult).eq("233");
    expect(staticModelContainer.state.age).eq(233);

    const dynamicModelContainer = store.getContainer(dynamicModel);
    expect(dynamicModelContainer.isRegistered).eq(false);
    expect(dynamicModelContainer.namespace).eq("dynamicModels");

    const dynamicModel1Container = store.getContainer(dynamicModel, "1");
    expect(dynamicModel1Container.isRegistered).eq(false);
    expect(dynamicModel1Container.namespace).eq("dynamicModels/1");

    dynamicModel1Container.register({
      name: "hahaha"
    });
    expect(dynamicModel1Container.isRegistered).eq(true);
    expect(dynamicModel1Container.getters.summary).eq("hahaha - 0");
    expect(dynamicModel1Container.getters.staticSummary).eq("meow - 233");

    const dynamicModel2Container = store.getContainer(dynamicModel, "2");
    expect(dynamicModel2Container.isRegistered).eq(false);
    expect(dynamicModel2Container.namespace).eq("dynamicModels/2");

    dynamicModel2Container.register({
      name: "zzzzzz"
    });
    expect(dynamicModel2Container.isRegistered).eq(true);
    expect(dynamicModel2Container.getters.summary).eq("zzzzzz - 0");

    const dynamicModel2SetNamePromise = dynamicModel2Container.actions.setNameAsync.dispatch(
      "Orz"
    );
    dynamicModel2Container.unregister();
    expect(dynamicModel2Container.isRegistered).eq(false);
    await dynamicModel2SetNamePromise;
    expect(dynamicModel2Container.state.name).eq(""); // setName is not applied after unregister

    const autoRegisteredDynamicContainer = store.getContainer(
      autoRegisteredDynamicModel,
      "O_O"
    );
    expect(autoRegisteredDynamicContainer.isRegistered).eq(false);
    expect(autoRegisteredDynamicContainer.state.name).eq("");

    expect(autoRegisteredDynamicContainer.isRegistered).eq(false);
    expect(autoRegisteredDynamicContainer.getters.summary).eq(" - 0");

    expect(autoRegisteredDynamicContainer.isRegistered).eq(false);
    autoRegisteredDynamicContainer.actions.setName.dispatch("^_^");

    expect(autoRegisteredDynamicContainer.isRegistered).eq(true);
    expect(autoRegisteredDynamicContainer.state.name).eq("^_^");
  });
});
