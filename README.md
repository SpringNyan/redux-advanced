# redux-advanced

> A state management library based on Redux. Provide advanced features and full TypeScript support.

[![npm version](https://img.shields.io/npm/v/redux-advanced.svg)](https://www.npmjs.com/package/redux-advanced)

[中文文档](https://github.com/SpringNyan/redux-advanced/blob/master/README-zh.md)

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

4. Get container by `store.useContainer`, then get state or dispatch actions

```typescript
const container = store.useContainer(model);

console.log(container.state.name);
console.log(container.getters.info);
container.actions.setName.dispatch("nyan");
```

## Changelogs

- 0.5.0

  - Initial beta version

## License

MIT
