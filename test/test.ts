import { expect } from "chai";

import { timer } from "rxjs";

import { createAdvancedStore, createModelBuilder } from "../lib";

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
        setNameAsync: ({ actions }, payload: string) => async (dispatch) => {
          await timer(100).toPromise();
          await actions.setName.dispatch(payload, dispatch);
        }
      })
      .freeze();

    const staticModel = testModelBuilder.build({
      name: "nyan"
    });

    const dynamicModel = testModelBuilder
      .selectors({
        staticSummary: ({ useContainer }) =>
          useContainer(staticModel).getters.summary
      })
      .build();

    const appDependencies: IDependencies = { appId: 233 };

    const store = createAdvancedStore(appDependencies, {
      staticModel,
      dynamicModels: [dynamicModel]
    });
    const staticModelContainer = store.useContainer(staticModel);
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
    await staticModelSetNamePromise;
    expect(staticModelContainer.state.name).eq("meow");

    const dynamicModelContainer = store.useContainer(dynamicModel);
    expect(dynamicModelContainer.isRegistered).eq(false);
    expect(dynamicModelContainer.namespace).eq("dynamicModels");

    const dynamicModel1Container = store.useContainer(dynamicModel, "1");
    expect(dynamicModel1Container.isRegistered).eq(false);
    expect(dynamicModel1Container.namespace).eq("dynamicModels/1");

    dynamicModel1Container.register({
      name: "hahaha"
    });
    expect(dynamicModel1Container.isRegistered).eq(true);
    expect(dynamicModel1Container.getters.summary).eq("hahaha - 0");
    expect(dynamicModel1Container.getters.staticSummary).eq("meow - 998");

    const dynamicModel2Container = store.useContainer(dynamicModel, "2");
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
    expect(dynamicModel2Container.state).eq(undefined);
    await dynamicModel2SetNamePromise;
    expect(dynamicModel2Container.state).eq(undefined);
  });
});
