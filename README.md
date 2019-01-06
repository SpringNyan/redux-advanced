# redux-advanced

> 基于 Redux 的状态管理框架，提供增强功能以及完善的 TypeScript 支持。

[![npm version](https://img.shields.io/npm/v/redux-advanced.svg)](https://www.npmjs.com/package/redux-advanced)

## 特点

- 完善的 TypeScript 支持 (需要 TypeScript 3.2+)
- 支持在 reducer 中以 mutate 方式修改 state (依赖于 immer)
- 支持通过 effect/epic 进行异步处理 (依赖于 redux-observable 及 rxjs)
- 支持通过 selector/getter 派生状态
- 支持 model 以及对其动态注册卸载 (可模拟多 store)
- 提供 model 间互操作能力
- 低侵入性

## 安装

0. 确保项目使用 TypeScript 3.2+

1. 安装依赖模块

```sh
npm i redux redux-observable rxjs immer
```

2. 安装 redux-advanced

```sh
npm i redux-advanced
```

## 使用

1. 通过`createModelBuilder`创建默认的`ModelBuilder`。

```typescript
const defaultModelBuilder = createModelBuilder()
  .dependencies<IDependencies>() // 提供dependencies接口
  .freeze(); // 冻结此ModelBuilder
```

2. 通过`ModelBuilder`创建 model

```typescript
const model = defaultModelBuilder
  // 提供props
  .props({
    id: 0
  })
  // 提供state
  .state({
    name: "",
    nums: [] as number[]
  })
  // 多次调用state可以合并
  .state(({ props }) => ({
    id: props.id
  }))
  // 提供selectors
  .selectors({
    info: ({ state }) => `${state.id} - ${state.name}`
  })
  // 可以使用createSelector创建带缓存的selector (类似于reselect)
  .selectors((createSelector) => ({
    calculatedNums: createSelector(
      ({ state }) => state.nums,
      (nums, { dependencies }) => nums.map(dependencies.expensiveCalculate)
    )
  }))
  // 提供reducers
  .reducers({
    setName(state, payload: string) {
      state.name = payload;
    }
  })
  // 提供effects
  .effects({
    setNameAsync: ({ actions }, payload: string) => async (dispatch) => {
      await timer(100).toPromise();
      await actions.setName.dispatch(payload, dispatch);
    }
  })
  // 提供epics
  .epics([
    ({ rootAction$, getState }) =>
      rootAction$.pipe(
        mergeMap((action) => {
          console.log(action.type);
          console.log(getState());
          return empty();
        })
      )
  ])
  // 构建model
  .build({ id: 998 });
```

3. 通过`createAdvancedStore`创建 Store。

```typescript
const store = createAdvancedStore(dependencies, {
  model
});
```

4. 通过`store.useContainer`获得 model 对应的 container，进行操作

```typescript
const container = store.useContainer(model);

console.log(container.state.name);
console.log(container.getters.info);
container.actions.setName.dispatch("nyan");
```

## 更新历史

- 0.1.0
  - 最初版本

## License

MIT
