export default {
  input: "./lib/index.js",
  output: {
    file: "./dist/redux-advanced.js",
    format: "esm"
  },
  external: ["redux", "redux-observable", "rxjs", "rxjs/operators", "immer"]
};
