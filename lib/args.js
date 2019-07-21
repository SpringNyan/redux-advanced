import { nil } from "./util";
export var argsRequired = function (fakeValue) { return [
    nil,
    "RequiredArg",
    fakeValue
]; };
export function isRequiredArg(obj) {
    return Array.isArray(obj) && obj[0] === nil && obj[1] === "RequiredArg";
}
