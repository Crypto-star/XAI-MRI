"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import { Upload, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { ResultsView } from "@/components/results-view"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Sample MRI images
const sampleImages = [
  {
    id: 1,
    src: "/placeholder.svg?height=300&width=300",
    alt: "Sample MRI 1",
    result: "Tumor Detected",
    confidence: 0.92,
  },
  {
    id: 2,
    src: "/placeholder.svg?height=300&width=300",
    alt: "Sample MRI 2",
    result: "No Tumor Detected",
    confidence: 0.87,
  },
  {
    id: 3,
    src: "/placeholder.svg?height=300&width=300",
    alt: "Sample MRI 3",
    result: "Tumor Detected",
    confidence: 0.78,
  },
  {
    id: 4,
    src: "/placeholder.svg?height=300&width=300",
    alt: "Sample MRI 4",
    result: "No Tumor Detected",
    confidence: 0.95,
  },
]

export function BrainTumorClassifier() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGeneratingGptAnalysis, setIsGeneratingGptAnalysis] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modelMissing, setModelMissing] = useState(false)
  const [result, setResult] = useState<{
    result: string
    confidence: number
    predictedClass?: string
    rawPredictions?: {
      labels: string[]
      probabilities: number[]
      predictedClassIndex?: number
    }
    xaiResults: {
      features: string[]
      importance: number[]
    }
    gradcamUrl?: string
    gptResponse: string
  } | null>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string)
        setSelectedImage(event.target?.result as string)
        setResult(null)
        setShowResults(false)
        setError(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const selectSampleImage = (image: (typeof sampleImages)[0]) => {
    setSelectedImage(image.src)
    setUploadedImage(null)
    setResult(null)
    setShowResults(false)
    setError(null)
  }

  const getGptAnalysis = async (imageData: string, modelResults: any) => {
    setIsGeneratingGptAnalysis(true)

    try {
      const response = await fetch("/api/gpt-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: imageData,
          modelResults: modelResults,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`GPT analysis failed: ${errorText}`)
      }

      const data = await response.json()
      return data.analysis
    } catch (error) {
      console.error("Error getting GPT analysis:", error)
      return "GPT analysis could not be generated. Please try again later."
    } finally {
      setIsGeneratingGptAnalysis(false)
    }
  }

  // Add this function after the getGptAnalysis function
  const getGradCAM = async (imageData: string, classIndex: number) => {
    try {
      const response = await fetch("/api/gradcam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: imageData,
          classIndex: classIndex,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("GradCAM API error:", errorText)
        throw new Error(`GradCAM generation failed: ${errorText}`)
      }

      const data = await response.json()
      return data.gradcamUrl || ""
    } catch (error) {
      console.error("Error getting GradCAM:", error)
      // Return empty string instead of throwing error
      return ""
    }
  }

  const analyzeImage = async () => {
    if (!selectedImage) return

    setIsAnalyzing(true)
    setError(null)
    setModelMissing(false)

    try {
      // For sample images, we'll use the actual model for prediction
      const sampleImage = sampleImages.find((img) => img.src === selectedImage)

      if (sampleImage) {
        // For demo purposes, we'll use the pre-defined results for sample images
        // In a real application, you would send these to the model as well
        const isTumor = sampleImage.result.includes("Tumor")

        // Generate mock XAI results
        const xaiFeatures = isTumor
          ? ["Irregular border", "Heterogeneous texture", "Mass effect", "Contrast enhancement", "Perilesional edema"]
          : ["Regular shape", "Homogeneous texture", "No mass effect", "No enhancement", "No edema"]

        const xaiImportance = xaiFeatures.map(() => 0.5 + Math.random() * 0.5)

        // Sort features by importance
        const sortedFeatures = [...xaiFeatures]
        const sortedImportance = [...xaiImportance]

        // Sort both arrays based on importance values (descending)
        for (let i = 0; i < sortedImportance.length; i++) {
          for (let j = i + 1; j < sortedImportance.length; j++) {
            if (sortedImportance[i] < sortedImportance[j]) {
              // Swap importance values
              ;[sortedImportance[i], sortedImportance[j]] = [sortedImportance[j], sortedImportance[i]]
              // Swap corresponding features
              ;[sortedFeatures[i], sortedFeatures[j]] = [sortedFeatures[j], sortedFeatures[i]]
            }
          }
        }

        // Generate mock GPT response
        const gptResponse = isTumor
          ? "The MRI scan shows characteristics consistent with a brain tumor. The image displays an abnormal mass with irregular borders and heterogeneous signal intensity. There appears to be surrounding edema and possible mass effect on adjacent structures. Based on imaging features alone, this could represent a high-grade glioma, but histopathological confirmation would be necessary for definitive diagnosis."
          : "The MRI scan appears to show normal brain anatomy without evidence of a tumor. The brain parenchyma demonstrates normal signal intensity throughout, with no focal lesions, abnormal enhancement, or mass effect identified. The ventricles are of normal size and configuration. Gray-white matter differentiation is preserved."

        setResult({
          result: sampleImage.result,
          confidence: sampleImage.confidence,
          xaiResults: {
            features: sortedFeatures,
            importance: sortedImportance,
          },
          gradcamUrl: isTumor
            ? "/placeholder.svg?height=300&width=300&text=GradCAM+Tumor"
            : "/placeholder.svg?height=300&width=300&text=GradCAM+Normal",
          gptResponse: gptResponse,
        })

        setIsAnalyzing(false)
        setShowResults(true)
      } else {
        // For uploaded images, call our Next.js API route
        console.log("Calling API with uploaded image")

        const response = await fetch("/api/predict", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: selectedImage,
          }),
        })

        console.log("API response status:", response.status)

        // Check if the response is OK (status in the range 200-299)
        if (!response.ok) {
          const errorText = await response.text()
          console.error("API error response:", errorText)

          // Try to parse as JSON, but handle case where it's not JSON
          try {
            const errorJson = JSON.parse(errorText)
            const errorMessage = errorJson.error || "Server error: " + response.status

            // Check if the error is about the model file
            if (errorMessage.includes("Model file not found")) {
              setModelMissing(true)
            }

            throw new Error(errorMessage)
          } catch (parseError) {
            // If parsing fails, use the raw text or status
            throw new Error("Server error: " + (errorText || response.status))
          }
        }

        // Get the raw text first
        const responseText = await response.text()
        console.log("Raw API response:", responseText)

        // Then try to parse it
        let responseData
        try {
          responseData = JSON.parse(responseText)
        } catch (e) {
          console.error("Failed to parse API response:", e)
          throw new Error("Invalid response from server: " + responseText.substring(0, 100) + "...")
        }

        if (responseData.error) {
          if (responseData.error.includes("Model file not found")) {
            setModelMissing(true)
          }
          throw new Error(responseData.error)
        }

        // Now get GPT analysis using the model results and image
        const gptAnalysis = await getGptAnalysis(selectedImage, responseData)

        // Try to get GradCAM visualization if not already provided
        let gradcamUrl = responseData.gradcamUrl
        if (!gradcamUrl && responseData.rawPredictions?.predictedClassIndex !== undefined) {
          setIsAnalyzing(true) // Keep the loading state
          gradcamUrl = await getGradCAM(selectedImage, responseData.rawPredictions.predictedClassIndex)
          setIsAnalyzing(false)
        }

        // Update the response data with the GPT analysis and GradCAM
        responseData.gptResponse = gptAnalysis
        responseData.gradcamUrl = gradcamUrl

        setResult(responseData)
        setIsAnalyzing(false)
        setShowResults(true)
      }
    } catch (error) {
      console.error("Error analyzing image:", error)
      setIsAnalyzing(false)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
    }
  }

  const resetClassifier = () => {
    setSelectedImage(null)
    setUploadedImage(null)
    setResult(null)
    setShowResults(false)
    setError(null)
    setModelMissing(false)
  }

  const goBackToSelection = () => {
    setShowResults(false)
  }

  // If we're showing results and have result data, render the results view
  if (showResults && result && selectedImage) {
    return <ResultsView imageUrl={selectedImage} result={result} onBack={goBackToSelection} />
  }

  // Otherwise show the selection/upload interface
  return (
    <div className="max-w-4xl mx-auto">
      {modelMissing && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Model file not found</AlertTitle>
          <AlertDescription>
            Please make sure your model file is in the python/models directory.
            <div className="mt-2 text-sm">
              <strong>Required path:</strong> python/models/brain_tumor_model.pkl, python/models/brain_tumor_model.h5,
              or python/models/brain_tumor_model.keras
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="upload">Upload MRI</TabsTrigger>
          <TabsTrigger value="samples">Sample Images</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <Upload className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-sm text-gray-400 mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-500">SVG, PNG, JPG or GIF (MAX. 10MB)</p>
                <input id="file-upload" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </div>
            </CardContent>
          </Card>

          {uploadedImage && !selectedImage && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-400 mb-4">Uploaded Image:</p>
              <div className="relative w-64 h-64 mx-auto border rounded-lg overflow-hidden">
                <Image src={uploadedImage || "/placeholder.svg"} alt="Uploaded MRI" fill className="object-cover" />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="samples">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sampleImages.map((image) => (
              <div
                key={image.id}
                className={cn(
                  "relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all",
                  selectedImage === image.src
                    ? "border-primary ring-2 ring-primary ring-opacity-50"
                    : "border-gray-800 hover:border-gray-700",
                )}
                onClick={() => selectSampleImage(image)}
              >
                <Image src={image.src || "/placeholder.svg"} alt={image.alt} fill className="object-cover" />
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {selectedImage && (
        <div className="mt-8 flex flex-col items-center">
          <div className="relative w-64 h-64 mx-auto border rounded-lg overflow-hidden mb-6">
            <Image src={selectedImage || "/placeholder.svg"} alt="Selected MRI" fill className="object-cover" />
          </div>

          <Button onClick={analyzeImage} disabled={isAnalyzing || isGeneratingGptAnalysis} className="w-full max-w-xs">
            {isAnalyzing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : isGeneratingGptAnalysis ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generating GPT Analysis...
              </>
            ) : (
              "Analyze Image"
            )}
          </Button>

          {error && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-md text-red-400 max-w-xs w-full text-center">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

