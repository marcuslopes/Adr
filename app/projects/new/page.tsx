import { NewProjectForm } from "./NewProjectForm";

export default function NewProjectPage() {
  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New project</h1>
        <p className="text-gray-500 mt-1">Create a new ADR project for your team</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <NewProjectForm />
      </div>
    </div>
  );
}
