import { Model } from "survey-core";

export default function PreloadExternalData(survey: Model) {
    // Preload external data into the survey
    survey.setVariable("u_req_product", "Jaffa Cakes");
    survey.setVariable("u_req_store", "Sainsbury's");
    survey.setVariable("u_req_date", "01/02/2025");
    survey.setVariable("u_req_samplegroup", "GROUP A");
    survey.setVariable("u_req_brand", "Oreo");
    survey.setVariable("u_req_buyer", "");
    survey.setVariable("u_req_brandcoded", "");
}
