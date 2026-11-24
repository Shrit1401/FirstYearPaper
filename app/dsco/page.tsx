import { ModulePicker } from "@/components/dsco/module-picker";
import { moduleCards } from "@/lib/dsco/syllabus";

export default function DscoPage() {
  return <ModulePicker modules={moduleCards()} />;
}
