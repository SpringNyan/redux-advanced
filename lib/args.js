import { mapObjectDeeply, merge, nil } from "./util";
export var argsRequired = function (fakeValue) { return [
    nil,
    "RequiredArg",
    fakeValue
]; };
export function isRequiredArg(obj) {
    return Array.isArray(obj) && obj[0] === nil && obj[1] === "RequiredArg";
}
export function generateArgs(model, context, args, optional) {
    var result = model.args(context);
    if (result !== undefined) {
        if (args !== undefined) {
            merge(result, args);
        }
        mapObjectDeeply(result, result, function (value) {
            if (isRequiredArg(value)) {
                if (optional) {
                    return value[2];
                }
                else {
                    throw new Error("arg is required");
                }
            }
        });
    }
    return result;
}
