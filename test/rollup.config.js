import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";

export default {
  input: "./test/test.js",
  output: {
    file: "./test/test.build.js",
    format: "cjs",
  },
  plugins: [
    resolve({
      browser: true,
    }),
    commonjs({
      namedExports: {
        chai: ["expect"],
      },
    }),
  ],
};
