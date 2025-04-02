import { FunctionFactory } from "survey-core";

export default function CustomExpressionFunctions() {
    
    // Returns true if a multiple choice question contains more than one selection
    FunctionFactory.Instance.register("MultipleAnswers", function (params) {
        return Array.isArray(params[0]) && params[0].length > 1;
    });

    // Returns the number of selected choices, capped at 3
    FunctionFactory.Instance.register("TopCount", function (params) {
        if(Array.isArray(params[0])) {
            if(params[0].length >= 3) {
                return 3;
            }
            else {
                return params[0].length;
            }
        }
    });
}
