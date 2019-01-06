import { expect } from "chai";

import { timer } from "rxjs";

import { createAdvancedStore, createModelBuilder } from "../lib";

interface IDependencies {
  appId: number;
}

describe("redux-advanced", () => {
  it("test", async () => {
    const defaultModelBuilder = createModelBuilder()
      .dependencies<IDependencies>()
      .freeze();

    const staticModel = defaultModelBuilder
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
      .build({
        name: "nyan"
      });

    const appDependencies: IDependencies = { appId: 233 };

    const store = createAdvancedStore(appDependencies, {
      staticModel
    });
    const staticModelContainer = store.useContainer(staticModel);

    expect(staticModelContainer.isRegistered).eq(true);
    expect(staticModelContainer.canRegister).eq(false);

    expect(staticModelContainer.state.name).eq("nyan");
    expect(staticModelContainer.getters.fullSummary).eq("233 - nyan - 0");

    staticModelContainer.actions.setAge.dispatch(998);
    expect(staticModelContainer.state.age).eq(998);

    const setNamePromise = staticModelContainer.actions.setNameAsync.dispatch(
      "meow"
    );
    expect(staticModelContainer.state.name).eq("nyan");
    await setNamePromise;
    expect(staticModelContainer.state.name).eq("meow");
  });
});
