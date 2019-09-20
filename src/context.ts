import { Store } from "redux";
import { Epic as ReduxObservableEpic } from "redux-observable";
import { Observable, Subject } from "rxjs";
import { distinctUntilChanged } from "rxjs/operators";

import { AnyAction } from "./action";
import { ContainerImpl, createGetContainer, GetContainer } from "./container";
import { Effect } from "./effect";
import { Model } from "./model";
import { Reducer } from "./reducer";
import { ReduxAdvancedOptions } from "./store";
import { splitLastPart } from "./util";

export interface ModelContext {
  isDynamic: boolean;
  modelIndex: number | undefined;

  baseNamespace: string;
  basePath: string;

  reducerByActionName: Map<string, Reducer>;
  effectByActionName: Map<string, Effect>;

  containerByKey: Map<string | undefined, ContainerImpl>;
}

export interface StoreContext {
  store: Store;
  options: ReduxAdvancedOptions;

  getContainer: GetContainer;

  addEpic$: Subject<ReduxObservableEpic>;
  switchEpic$: Subject<void>;

  adHocRootState: any;

  rootActionSubject: Subject<AnyAction>;
  rootAction$: Observable<AnyAction>;
  rootStateSubject: Subject<any>;
  rootState$: Observable<any>;

  contextByModel: Map<Model, ModelContext>;
  modelsByBaseNamespace: Map<string, Model[]>;
  containerByNamespace: Map<string, ContainerImpl>;
  deferredByAction: WeakMap<
    AnyAction,
    {
      resolve: (value: any) => void;
      reject: (err: any) => void;
    }
  >;

  getDependencies: () => any;
  resolveActionName: (paths: string[]) => string;
  parseNamespace: (
    namespace: string
  ) => {
    baseNamespace: string;
    key: string | undefined;
    models: Model[];
  } | null;
}

export function createStoreContext(): StoreContext {
  const rootActionSubject = new Subject<AnyAction>();
  const rootAction$ = rootActionSubject;

  const rootStateSubject = new Subject<any>();
  const rootState$ = rootStateSubject.pipe(distinctUntilChanged());

  const storeContext: StoreContext = {
    store: undefined!,
    options: undefined!,

    getContainer: undefined!,

    addEpic$: new Subject(),
    switchEpic$: new Subject(),

    adHocRootState: undefined,

    rootActionSubject,
    rootAction$,
    rootStateSubject,
    rootState$,

    contextByModel: new Map(),
    modelsByBaseNamespace: new Map(),
    containerByNamespace: new Map(),
    deferredByAction: new WeakMap(),

    getDependencies: () => {
      return storeContext.options.dependencies;
    },
    resolveActionName: (paths) => {
      if (storeContext.options.resolveActionName) {
        return storeContext.options.resolveActionName(paths);
      }

      return paths.join(".");
    },
    parseNamespace: (namespace) => {
      let baseNamespace: string = namespace;
      let key: string | undefined;

      let models = storeContext.modelsByBaseNamespace.get(namespace);
      if (models == null) {
        [baseNamespace, key] = splitLastPart(namespace);
        models = storeContext.modelsByBaseNamespace.get(baseNamespace);
      }
      if (models == null) {
        return null;
      }

      return {
        baseNamespace,
        key,
        models
      };
    }
  };

  storeContext.getContainer = createGetContainer(storeContext);

  return storeContext;
}
