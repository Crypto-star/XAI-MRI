import { BrainTumorClassifier } from "@/components/brain-tumor-classifier"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950">
      <div className="container mx-auto px-4 py-12">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-50 mb-4">Brain Tumor MRI Classifier</h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Upload your MRI scan or select from our sample images to analyze for potential brain tumors.
          </p>
        </header>

        <BrainTumorClassifier />
      </div>
    </main>
  )
}

