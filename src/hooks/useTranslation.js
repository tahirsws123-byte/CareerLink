import useAuth from "./useAuth";
import { translate } from "../utils/language";

export default function useTranslation() {
  const { user } = useAuth();
  const language = user?.preferredLanguage || "en";
  return (text) => translate(text, language);
}
