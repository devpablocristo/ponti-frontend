import ProjectEditor, { type ProjectEditorProps } from "../../projects/ProjectEditor";

type CustomerEditorProps = Omit<ProjectEditorProps, "mode">;

export default function CustomerEditor(props: CustomerEditorProps = {}) {
  return <ProjectEditor {...props} mode="customerOnly" />;
}
