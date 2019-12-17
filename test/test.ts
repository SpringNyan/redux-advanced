import { expect } from "chai";
import { empty, timer } from "rxjs";
import { filter, mergeMapTo, take, tap } from "rxjs/operators";
import { createModelBuilder, init } from "../lib";

interface Dependencies {
  appId: number;
}

const defaultModelBuilder = createModelBuilder()
  .dependencies<Dependencies>()
  .freeze();

describe("redux-advanced", () => {
  it("test", async () => {
    let setAge2Count = 0;
    let setAge2Count2 = 0;

    const testModelBuilder = defaultModelBuilder
      .state(() => ({
        name: "",
        age: 0,
      }))
      .selectors({
        rootAction$: ({ rootAction$ }) => rootAction$,
      })
      .selectors({
        _: {
          name: ({ getState }) => getState().name,
        },
        summary: ({ getState }) => `${getState().name} - ${getState().age}`,
      })
      .selectors((createSelector) => ({
        _: {
          age: createSelector(
            ({ getState }) => getState().age,
            (age) => age
          ),
        },
        fullSummary: createSelector(
          ({ getters }) => getters.summary,
          (summary, { dependencies }) => `${dependencies.appId} - ${summary}`
        ),
        summary2: createSelector(
          [({ getState }) => getState().name, ({ getState }) => getState().age],
          ([name, age]) => `${name} - ${age}`
        ),
        getName: createSelector(({ getState }) => () => getState().name),
      }))
      .selectors({
        _: {
          $: {
            summary: ({ getters }) => `${getters._.name} - ${getters._.age}`,
          },
        },
      })
      .reducers({
        _: {
          setName1(state, payload: string) {
            state.name = payload;
          },
          nested: {
            setName2(state, payload: string) {
              state.name = payload;
            },
          },
        },
        setName(state, payload: string) {
          state.name = payload;
        },
        setAge(state, payload: number) {
          state.age = payload;
        },
      })
      .effects({
        _: {
          setAge1: async ({ actions }, payload: number) => {
            await actions.setAge.dispatch(payload);
          },
        },
        $: {
          setAge2: async ({ actions }, payload: number) => {
            await actions.setAge.dispatch(payload);
          },
        },
        setName: async (context, payload: string) => {
          return payload;
        },
        innerThrow: async () => {
          throw new Error();
        },
        overrideSetInfo: async ({ actions }) => {
          await actions.setName.dispatch("haha");
        },
      })
      .effects({
        setNameAsync: async ({ actions, getState }, payload: string) => {
          await timer(50).toPromise();
          getState();
          await actions.setName.dispatch(payload);
        },
        setAgeAsync: async ({ getContainer }, payload: number) => {
          await timer(50).toPromise();
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          await getContainer(staticModel).actions.setAge.dispatch(payload);
          return "" + payload;
        },
        outerThrow: async ({ actions }) => {
          await actions.innerThrow.dispatch({});
        },
      })
      .selectors((createSelector) => ({
        setName: createSelector(({ actions }) => (name: string) => {
          actions.setName.dispatch(name);
        }),
      }))
      .overrideEffects((base) => ({
        overrideSetInfo: async (context) => {
          await base.overrideSetInfo(context);
          await context.actions.setAge.dispatch(666);
        },
      }))
      .epics({
        "@@": {
          countSetAge2: ({ rootAction$, actions }) =>
            rootAction$.ofType(actions.$.setAge2.type).pipe(
              tap(() => (setAge2Count += 1)),
              mergeMapTo(empty())
            ),
        },
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
          ),
      ])
      .freeze();

    const staticModel = testModelBuilder
      .overrideState(() => ({
        name: "nyan",
      }))
      .build();

    const dynamicModel = testModelBuilder
      .args(({ required }) => ({
        name: required("fake"),
        aaa: 123,
        bbb: "123",
        ccc: {
          foo: "foo",
          bar: 666,
        },
      }))
      .extend(
        defaultModelBuilder
          .args(({ required }) => ({
            a: 1,
            b: 2,
            z: required({ foo: 1 }),
          }))
          .build(),
        "foo"
      )
      .extend(
        defaultModelBuilder
          .args(() => ({
            a: 1,
            b: 2,
            z: "z",
          }))
          .build(),
        "bar"
      )
      .overrideState(() => ({ args }) => ({
        name: args.name,
      }))
      .selectors({
        staticSummary: ({ getContainer }) =>
          getContainer(staticModel).getters.summary,
      })
      .build();

    const dynamicModel2 = testModelBuilder.build();

    const autoRegisteredDynamicModel = testModelBuilder
      .options({
        autoRegister: true,
      })
      .build();

    const appDependencies: Dependencies = { appId: 233 };

    let unhandledEffectErrorCount = 0;
    const { getContainer: storeGetContainer, registerModels } = init({
      dependencies: appDependencies,

      onUnhandledEffectError: () => {
        unhandledEffectErrorCount += 1;
      },
    });
    registerModels({
      staticModel,
      dynamicModels: [dynamicModel, dynamicModel2],
      autoRegisteredDynamicModel: [autoRegisteredDynamicModel],
    });

    const staticModelContainer = storeGetContainer(staticModel);
    expect(staticModelContainer.baseNamespace).eq("staticModel");
    expect(staticModelContainer.key).eq(undefined);
    expect(staticModelContainer.modelIndex).eq(undefined);

    expect(storeGetContainer("staticModel")).eq(staticModelContainer);

    let setAge233Dispatched = false;
    staticModelContainer.getters.rootAction$
      .pipe(
        filter(
          (action) =>
            staticModelContainer.actions.setAge.is(action) &&
            action.payload === 233
        ),
        take(1),
        tap(() => {
          setAge233Dispatched = true;
        })
      )
      .toPromise();

    expect(staticModelContainer.isRegistered).eq(true);
    expect(staticModelContainer.canRegister).eq(false);

    expect(staticModelContainer.getState().name).eq("nyan");
    expect(staticModelContainer.getters.fullSummary).eq("233 - nyan - 0");

    staticModelContainer.actions.setAge.dispatch(998);
    expect(staticModelContainer.getState().age).eq(998);

    const staticModelSetNamePromise = staticModelContainer.actions.setNameAsync.dispatch(
      "meow"
    );
    expect(staticModelContainer.getState().name).eq("nyan");
    const staticModelSetNameResult = await staticModelSetNamePromise;
    expect(staticModelSetNameResult).eq(undefined);
    expect(staticModelContainer.getState().name).eq("meow");

    expect(staticModelContainer.getters.getName()).eq("meow");
    expect(staticModelContainer.getters.getName).eq(
      staticModelContainer.getters.getName
    );

    staticModelContainer.getters.setName("haha");
    expect(staticModelContainer.getState().name).eq("haha");

    expect(setAge233Dispatched).eq(false);
    const staticModelSetAgePromise = staticModelContainer.actions.setAgeAsync.dispatch(
      233
    );
    expect(staticModelContainer.getState().age).eq(998);
    const staticModelSetAgeResult = await staticModelSetAgePromise;
    expect(staticModelSetAgeResult).eq("233");
    expect(staticModelContainer.getState().age).eq(233);
    expect(setAge233Dispatched).eq(true);

    await staticModelContainer.actions._.setName1.dispatch("_1");
    expect(staticModelContainer.getState().name).eq("_1");
    await staticModelContainer.actions._.nested.setName2.dispatch("_2");
    expect(staticModelContainer.getState().name).eq("_2");
    await staticModelContainer.actions._.setAge1.dispatch(1);
    expect(staticModelContainer.getState().age).eq(1);

    expect(setAge2Count).eq(0);
    expect(setAge2Count2).eq(0);
    await staticModelContainer.actions.$.setAge2.dispatch(2);
    expect(setAge2Count).eq(1);
    expect(setAge2Count2).eq(3);
    await staticModelContainer.actions.$.setAge2.dispatch(22);
    expect(setAge2Count).eq(2);
    expect(setAge2Count2).eq(6);

    await staticModelContainer.actions.overrideSetInfo.dispatch({});
    expect(staticModelContainer.getState().name).eq("haha");
    expect(staticModelContainer.getState().age).eq(666);

    expect(staticModelContainer.getters._.name).eq("haha");
    expect(staticModelContainer.getters._.age).eq(666);
    expect(staticModelContainer.getters._.$.summary).eq("haha - 666");

    staticModelContainer.actions.outerThrow.dispatch({}).then(
      () => undefined,
      () => undefined
    );
    await timer(10).toPromise();
    expect(unhandledEffectErrorCount).eq(0);

    // staticModelContainer.actions.outerThrow.dispatch({}).then(() => undefined);
    // await timer(10).toPromise();
    // expect(unhandledEffectErrorCount).eq(1);

    // const dynamicModelContainer = storeGetContainer(dynamicModel);
    // expect(dynamicModelContainer.isRegistered).eq(false);
    // expect(dynamicModelContainer.namespace).eq("dynamicModels");

    const dynamicModel1Container = storeGetContainer(dynamicModel, "1");
    expect(storeGetContainer("dynamicModels", "1", 0)).eq(
      dynamicModel1Container
    );

    expect(dynamicModel1Container.isRegistered).eq(false);
    expect(dynamicModel1Container.baseNamespace).eq("dynamicModels");
    expect(dynamicModel1Container.key).eq("1");
    expect(dynamicModel1Container.modelIndex).eq(0);

    expect(dynamicModel1Container.getState().name).eq("fake");

    dynamicModel1Container.register({
      name: "hahaha",
      foo: {
        z: { foo: 233 },
      },
    });
    expect(dynamicModel1Container.isRegistered).eq(true);
    expect(dynamicModel1Container.getters.summary).eq("hahaha - 0");
    expect(dynamicModel1Container.getters.summary2).eq("hahaha - 0");
    expect(dynamicModel1Container.getters.staticSummary).eq("haha - 666");

    const dynamicModel2Container = storeGetContainer(dynamicModel, "2");
    expect(dynamicModel2Container.isRegistered).eq(false);
    expect(dynamicModel2Container.baseNamespace).eq("dynamicModels");
    expect(dynamicModel2Container.key).eq("2");
    expect(dynamicModel2Container.modelIndex).eq(0);

    expect(storeGetContainer("dynamicModels", "2", 0)).eq(
      dynamicModel2Container
    );

    dynamicModel2Container.register({
      name: "zzzzzz",
      foo: {
        z: { foo: 998 },
      },
    });
    expect(dynamicModel2Container.isRegistered).eq(true);
    expect(dynamicModel2Container.getters.summary).eq("zzzzzz - 0");
    expect(dynamicModel2Container.getters.summary2).eq("zzzzzz - 0");

    const dynamicModel2SetNamePromise = dynamicModel2Container.actions.setNameAsync.dispatch(
      "Orz"
    );
    dynamicModel2Container.unregister();
    expect(dynamicModel2Container.isRegistered).eq(false);

    let dynamicModel2SetNamePromiseResolved = false;
    (async () => {
      await dynamicModel2SetNamePromise;
      dynamicModel2SetNamePromiseResolved = true;
    })();
    await timer(60).toPromise();
    expect(dynamicModel2SetNamePromiseResolved).eq(false);
    expect(dynamicModel2Container.getState().name).eq("fake"); // setName is not applied after unregister

    expect(storeGetContainer("dynamicModels", "3", 1).modelIndex).eq(1);

    const autoRegisteredDynamicContainer = storeGetContainer(
      autoRegisteredDynamicModel,
      "O_O"
    );
    expect(autoRegisteredDynamicContainer.isRegistered).eq(false);
    expect(autoRegisteredDynamicContainer.getState().name).eq("");

    expect(autoRegisteredDynamicContainer.isRegistered).eq(false);
    expect(autoRegisteredDynamicContainer.getters.summary).eq(" - 0");

    expect(autoRegisteredDynamicContainer.isRegistered).eq(false);
    autoRegisteredDynamicContainer.actions.setName.dispatch("^_^");

    expect(autoRegisteredDynamicContainer.isRegistered).eq(true);
    expect(autoRegisteredDynamicContainer.getState().name).eq("^_^");
  });
});
