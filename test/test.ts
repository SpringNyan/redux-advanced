import { expect } from "chai";

import { empty, timer } from "rxjs";
import { mergeMapTo, tap } from "rxjs/operators";

import { createModelBuilder, createReduxAdvancedStore } from "../lib";

interface IDependencies {
  appId: number;
}

const defaultModelBuilder = createModelBuilder()
  .dependencies<IDependencies>()
  .freeze();

describe("redux-advanced", () => {
  it("test", async () => {
    let setAge2Count = 0;
    let setAge2Count2 = 0;

    const testModelBuilder = defaultModelBuilder
      .props({
        name: ""
      })
      .state(({ props }) => ({
        name: props.name,
        age: 0
      }))
      .selectors({
        _: {
          name: ({ state }) => state.name
        },
        summary: ({ state }) => `${state.name} - ${state.age}`
      })
      .selectors((createSelector) => ({
        _: {
          age: createSelector(
            ({ state }) => state.age,
            (age) => age
          )
        },
        fullSummary: createSelector(
          ({ getters }) => getters.summary,
          (summary, { dependencies }) => `${dependencies.appId} - ${summary}`
        ),
        summary2: createSelector(
          [({ state }) => state.name, ({ state }) => state.age],
          ([name, age]) => `${name} - ${age}`
        )
      }))
      .selectors({
        _: {
          $: {
            summary: ({ getters }) => `${getters._.name} - ${getters._.age}`
          }
        }
      })
      .reducers({
        _: {
          setName1(state, payload: string) {
            state.name = payload;
          },
          nested: {
            setName2(state, payload: string) {
              state.name = payload;
            }
          }
        },
        setName(state, payload: string) {
          state.name = payload;
        },
        setAge(state, payload: number) {
          state.age = payload;
        }
      })
      .effects({
        _: {
          setAge1: async ({ actions }, payload: number) => {
            await actions.setAge.dispatch(payload);
          }
        },
        $: {
          setAge2: async ({ actions }, payload: number) => {
            await actions.setAge.dispatch(payload);
          }
        },
        setName: async ({ actions, getState }, payload: string) => {
          return payload;
        },
        innerThrow: async () => {
          throw new Error();
        },
        overrideSetInfo: async ({ actions }) => {
          await actions.setName.dispatch("haha");
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
        },
        outerThrow: async ({ actions }) => {
          await actions.innerThrow.dispatch({});
        }
      })
      .overrideEffects((base) => ({
        overrideSetInfo: async (context) => {
          await base.overrideSetInfo(context);
          await context.actions.setAge.dispatch(666);
        }
      }))
      .epics({
        "@@": {
          countSetAge2: ({ rootAction$, actions }) =>
            rootAction$.ofType(actions.$.setAge2.type).pipe(
              tap(() => (setAge2Count += 1)),
              mergeMapTo(empty())
            )
        }
      })
      .epics([
        ({ rootAction$, actions }) =>
          rootAction$.ofType(actions.$.setAge2.type).pipe(
            tap(() => (setAge2Count2 += 1)),
            mergeMapTo(empty())
          ),
        ({ rootAction$, actions }) =>
          rootAction$.ofType(actions.$.setAge2.type).pipe(
            tap(() => (setAge2Count2 += 2)),
            mergeMapTo(empty())
          )
      ])
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

    let unhandledEffectErrorCount = 0;
    const store = createReduxAdvancedStore(
      appDependencies,
      {
        staticModel,
        dynamicModels: [dynamicModel],
        autoRegisteredDynamicModel: [autoRegisteredDynamicModel]
      },
      {
        effectErrorHandler: () => {
          unhandledEffectErrorCount += 1;
        }
      }
    );
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

    await staticModelContainer.actions._.setName1.dispatch("_1");
    expect(staticModelContainer.state.name).eq("_1");
    await staticModelContainer.actions._.nested.setName2.dispatch("_2");
    expect(staticModelContainer.state.name).eq("_2");
    await staticModelContainer.actions._.setAge1.dispatch(1);
    expect(staticModelContainer.state.age).eq(1);

    expect(setAge2Count).eq(0);
    expect(setAge2Count2).eq(0);
    await staticModelContainer.actions.$.setAge2.dispatch(2);
    expect(setAge2Count).eq(1);
    expect(setAge2Count2).eq(3);
    await staticModelContainer.actions.$.setAge2.dispatch(22);
    expect(setAge2Count).eq(2);
    expect(setAge2Count2).eq(6);

    await staticModelContainer.actions.overrideSetInfo.dispatch({});
    expect(staticModelContainer.state.name).eq("haha");
    expect(staticModelContainer.state.age).eq(666);

    expect(staticModelContainer.getters._.name).eq("haha");
    expect(staticModelContainer.getters._.age).eq(666);
    expect(staticModelContainer.getters._.$.summary).eq("haha - 666");

    staticModelContainer.actions.outerThrow
      .dispatch({})
      .then(() => undefined, () => undefined);
    await timer(10).toPromise();
    expect(unhandledEffectErrorCount).eq(0);

    // staticModelContainer.actions.outerThrow.dispatch({}).then(() => undefined);
    // await timer(10).toPromise();
    // expect(unhandledEffectErrorCount).eq(1);

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
    expect(dynamicModel1Container.getters.summary2).eq("hahaha - 0");
    expect(dynamicModel1Container.getters.staticSummary).eq("haha - 666");

    const dynamicModel2Container = store.getContainer(dynamicModel, "2");
    expect(dynamicModel2Container.isRegistered).eq(false);
    expect(dynamicModel2Container.namespace).eq("dynamicModels/2");

    dynamicModel2Container.register({
      name: "zzzzzz"
    });
    expect(dynamicModel2Container.isRegistered).eq(true);
    expect(dynamicModel2Container.getters.summary).eq("zzzzzz - 0");
    expect(dynamicModel2Container.getters.summary2).eq("zzzzzz - 0");

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
