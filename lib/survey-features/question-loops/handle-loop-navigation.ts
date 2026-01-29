import { DynamicPanelItemValueChangedEvent, QuestionPanelDynamicModel, SurveyModel } from "survey-core";

interface LoopingPanelModel extends QuestionPanelDynamicModel {
    loopSource?: string[];
    exitLoopCondition?: string;
    exitAllLoopsCondition?: string;
}

function resolveCondition(condition: string, panelName: string, currentIndex: number) {
    if (!condition) return "";

    // Regex looks for "{panel." (case insensitive)
    // and replaces it with "{PanelName[Index]."
    const absolutePath = `{${panelName}[${currentIndex}].`;
    return condition.replace(/\{panel\./gi, absolutePath);
}

export function handleLoopExits(survey: SurveyModel) {
    const handler = (sender: SurveyModel, options: DynamicPanelItemValueChangedEvent) => {
        const loopPanel = options.question as LoopingPanelModel;

        if (!loopPanel || !loopPanel.loopSource) return;

        const exitAllCond = loopPanel.exitAllLoopsCondition;
        const exitLoopCond = loopPanel.exitLoopCondition;

        if (!exitAllCond && !exitLoopCond) return;

        const currentIndex = options.panelIndex;
        if (currentIndex === undefined || currentIndex < 0) return;

        let shouldUpdateNavigation = false;

        // Logic for "Exit All Loops"
        if (typeof exitAllCond === "string" && exitAllCond.trim() !== "") {
            
            const globalExpression = resolveCondition(exitAllCond, loopPanel.name, currentIndex);
            const shouldExitAllLoops = sender.runCondition(globalExpression);

            if(currentIndex < loopPanel.panels.length) {
                // Toggle visibility for all SUBSEQUENT panels
                // If shouldExitAllLoops is true -> hide them. 
                // If shouldExitAllLoops is false -> show them (in case user changed their mind).
                for(let i=currentIndex + 1; i < loopPanel.panels.length; i++) {
                    loopPanel.panels[i].visible = !shouldExitAllLoops;
                    shouldUpdateNavigation = true;
                }
            }
        }

        // Logic for "Exit Current Loop"
        if (typeof exitLoopCond === "string" && exitLoopCond.trim() !== "") {
            
            const globalExpression = resolveCondition(exitLoopCond, loopPanel.name, currentIndex);
            const shouldExitCurrentLoop = sender.runCondition(globalExpression);
            const currentPanelQuestions = options.panel.questions;

            let triggerIndex = -1;

            for (let i = 0; i < currentPanelQuestions.length; i++) {
                if (currentPanelQuestions[i].name === options.name) {
                    triggerIndex = i;
                    break;
                }
            }

            if (triggerIndex === -1) return;

            // Toggle visibility for all SUBSEQUENT questions
            // If shouldExitCurrentLoop is true -> hide them. 
            // If shouldExitCurrentLoop is false -> show them (in case user changed their mind).
            for (let i = triggerIndex + 1; i < currentPanelQuestions.length; i++) {
                currentPanelQuestions[i].visible = !shouldExitCurrentLoop;
                shouldUpdateNavigation = true;
            }
        }

        if(shouldUpdateNavigation ) {
            sender.updateNavigationElements();
        }
    };

    survey.onDynamicPanelValueChanged.add(handler);

    return () => {
        survey.onDynamicPanelValueChanged.remove(handler);
    };
}