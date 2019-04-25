# redux-advanced

> A state management library based on Redux. Provide advanced features and full TypeScript support.

[![npm version](https://img.shields.io/npm/v/redux-advanced.svg)](https://www.npmjs.com/package/redux-advanced)

## Features

- Full TypeScript support (need TypeScript 3.2+)
- Support modify state directly in reducer (based on immer)
- Support async actions by effect/epic (based on redux-observable and RxJS)
- Support derived state by selector/getter
- Support model, it can be registered/unregistered dynamically
- Model has interoperability with other models
- Easy to integrate with other Redux related libraries

## Installation

0. Ensure TypeScript version is 3.2+ with strictNullChecks enabled

1. Install dependencies

```sh
npm i redux redux-observable rxjs immer
```

2. Install redux-advanced

```sh
npm i redux-advanced
```

## Usage

1. Create default `ModelBuilder` by `createModelBuilder`

```typescript
const defaultModelBuilder = createModelBuilder()
  .dependencies<IDependencies>() // provide dependencies interface
  .freeze(); // freeze this ModelBuilder
```

2. Create model by `defaultModelBuilder`

```typescript
const model = defaultModelBuilder
  // provide props
  .props({
    id: 0
  })
  // provide state
  .state({
    name: "",
    nums: [] as number[]
  })
  // state will be merged
  .state(({ props }) => ({
    id: props.id
  }))
  // provide selectors
  .selectors({
    info: ({ state }) => `${state.id} - ${state.name}`
  })
  // use createSelector to create cached selector (like reselect)
  .selectors((createSelector) => ({
    calculatedNums: createSelector(
      ({ state }) => state.nums,
      (nums, { dependencies }) => nums.map(dependencies.expensiveCalculate)
    )
  }))
  // provide reducers
  .reducers({
    setName(state, payload: string) {
      state.name = payload;
    }
  })
  // provide effects
  .effects({
    setNameAsync: ({ actions }, payload: string) => async (dispatch) => {
      await timer(100).toPromise();
      await actions.setName.dispatch(payload, dispatch);
    }
  })
  // provide epics
  .epics([
    ({ rootAction$, getState, actions }) =>
      rootAction$.ofType(actions.setName.type).pipe(
        mergeMap((action) => {
          console.log(getState());
          return empty();
        })
      )
  ])
  // build model
  .build({ id: 998 });
```

3. Create store by `createReduxAdvancedStore`

```typescript
const store = createReduxAdvancedStore(dependencies, {
  model
});
```

4. Get container by `store.getContainer`, then get state or dispatch actions

```typescript
const container = store.getContainer(model);

console.log(container.state.name);
console.log(container.getters.info);
container.actions.setName.dispatch("nyan");
```

## Changelogs

- 0.11.0

  - CHANGE: rename actionType `epicEnd` to `willUnregister`
  - ADD: add `namespace` to props, state, reducer context
  - FIX: remove `props` from reducer context

- 0.10.4

  - FIX: fix type error after upgrade immer to ^3.0.0

- 0.10.3

  - FIX: model won't extend `autoRegister`
  - FIX: fix effect is not invoked when dispatch an action manually

- 0.10.2

  - FIX: fix override type

- 0.10.1

  - FIX: fix props/state merge behavior
  - FIX: fix override partial type

- 0.10.0

  - CHANGE: change epics type from array to object
  - ADD: model selectors/reducers/effects/epics can be nested
  - ADD: add `resolveActionName` option

- 0.9.1

  - REVERT: revert default dependencies, props, state to `undefined`
  - ADD: support selector array in `createSelector`

- 0.9.0

  - CHANGE: remove `props` from effect, epic, selector
  - CHANGE: make dependencies, props, state types extend `object`
  - CHANGE: change default dependencies, props, state to `{}`
  - CHANGE: `effectErrorHandler` now returns `void` instead of `Promise<void>`
  - FIX: fix `effectErrorHandler` behavior
  - ADD: export `actionTypes`
  - ADD: support `rootState$` in effect
  - ADD: support override methods in model builder

- 0.9.0-alpha.4

  - ADD: support `rootAction$` in effect

- 0.9.0-alpha.3

  - REVERT: revert "effect will be rejected if container is not registered"

- 0.9.0-alpha.2

  - CHANGE: change effect signature to `(context, payload) => Promise<TResult>`
  - CHANGE: effect will be rejected if container is not registered
  - REMOVE: remove `toActionObservable`, `StrictActionHelper`, `StrictContainer`, `GetStrictContainer`

- 0.9.0-alpha.1

  - CHANGE: rename useContainer to getContainer

- 0.8.1

  - FIX: fix dispatch result type for strict action helper
  - FIX: fix find definitions issue in vscode for action helper

- 0.8.0

  - ADD: support effect result
  - ADD: expose more interfaces

- 0.7.0

  - CHANGE: container's properties won't throw error if container is not registered but can register
  - CHANGE: add `middleware` argument to `createStore` to handle auto register model
  - FIX: fix potential memory leak issue for container

- 0.6.0

  - CHANGE: context key will be `""` if key is not provided in `useContainer`
  - CHANGE: `useContainer` will cache generated container
  - CHANGE: `container.unregister` won't throw error if container is not registered
  - ADD: `container.unregister` will delete container cache in `useContainer`

- 0.5.0

  - Initial beta version

## License

MIT
