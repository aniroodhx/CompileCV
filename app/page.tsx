export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          ReWrite - Resume Optimizer
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Upload your resume and job description to get AI-powered suggestions
          for ATS optimization.
        </p>

        {/* Upload form will be added in Phase 3 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-500">Upload form coming soon...</p>
        </div>
      </div>
    </main>
  );
}
