import resolve from "rollup-plugin-node-resolve";

export default {
  input: "./lib/index.js",
  output: [
    {
      file: "./dist/redux-advanced.js",
      format: "cjs"
    },
    {
      file: "./dist/redux-advanced.esm.js",
      format: "esm"
    }
  ],
  plugins: [resolve()],
  external: ["redux", "redux-observable", "rxjs", "rxjs/operators", "immer"]
};
