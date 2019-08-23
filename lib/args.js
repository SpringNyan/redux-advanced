import { mapObjectDeeply, merge } from "./util";
export var requiredArgToken = "@@REQUIRED_ARG__" + Date.now();
export var requiredArgFunc = function (fakeValue) { return [
    requiredArgToken,
    fakeValue
]; };
export function isRequiredArg(obj) {
    return Array.isArray(obj) && obj[0] === requiredArgToken;
}
export function generateArgs(model, context, args, optional) {
    var result = model.args(context);
    if (args !== undefined) {
        merge(result, args);
    }
    mapObjectDeeply(result, result, function (value) {
        if (isRequiredArg(value)) {
            if (optional) {
                return value[1];
            }
            else {
                throw new Error("arg is required");
            }
        }
    });
    return result;
}
