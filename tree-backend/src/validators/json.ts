import { transform } from "../validator";

export const json = () => transform(JSON.parse);
