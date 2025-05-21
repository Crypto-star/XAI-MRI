"use client"

import { ArrowLeft } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type ResultsViewProps = {
  imageUrl: string
  result: {
    result: string
    confidence: number
    xaiResults: {
      features: string[]
      importance: number[]
    }
    gradcamUrl?: string
    gptResponse: string
    rawPredictions?: {
      labels: string[]
      probabilities: number[]
      predictedClassIndex?: number
    }
    predictedClass?: string
  }
  onBack: () => void
}

export function ResultsView({ imageUrl, result, onBack }: ResultsViewProps) {
  const isTumor = result.result.includes("Tumor")

  // Get the predicted class if available
  const predictedClass =
    result.predictedClass ||
    (result.rawPredictions?.predictedClassIndex !== undefined && result.rawPredictions.labels
      ? result.rawPredictions.labels[result.rawPredictions.predictedClassIndex]
      : isTumor
        ? "tumor"
        : "notumor")

  return (
    <div className="w-full">
      <Button variant="ghost" className="mb-6" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Selection
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Original Image and Prediction */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Original MRI Scan</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative w-full h-64 border rounded-lg overflow-hidden mb-4">
              <Image src={imageUrl || "/placeholder.svg"} alt="MRI Scan" fill className="object-contain" />
            </div>

            <div
              className={cn(
                "w-full p-4 rounded-lg text-center mt-4",
                isTumor ? "bg-red-950/20 border border-red-900" : "bg-green-950/20 border border-green-900",
              )}
            >
              <h3 className={cn("text-xl font-bold", isTumor ? "text-red-400" : "text-green-400")}>{result.result}</h3>
              <p className="text-sm text-gray-400 mt-1">Confidence: {(result.confidence * 100).toFixed(1)}%</p>
              {predictedClass && <p className="text-sm text-gray-400 mt-1">Class: {predictedClass}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Grad-CAM Visualization */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Grad-CAM Visualization</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative w-full h-64 border rounded-lg overflow-hidden mb-4">
              {result.gradcamUrl ? (
                <Image
                  src={result.gradcamUrl || "/placeholder.svg"}
                  alt="Grad-CAM Visualization"
                  fill
                  className="object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400">
                  Grad-CAM not available
                </div>
              )}
            </div>
            <p className="text-sm text-gray-400 text-center">
              Highlights regions that influenced the model's prediction
            </p>
          </CardContent>
        </Card>

        {/* Raw Model Predictions */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Model Predictions</CardTitle>
          </CardHeader>
          <CardContent>
            {result.rawPredictions ? (
              <div className="space-y-3">
                {result.rawPredictions.labels.map((label, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{label}</span>
                      <span className="text-sm text-gray-400">
                        {(result.rawPredictions?.probabilities[index] * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={cn(
                          "h-2 rounded-full",
                          result.rawPredictions?.predictedClassIndex === index
                            ? isTumor
                              ? "bg-red-500"
                              : "bg-green-500"
                            : "bg-gray-500",
                        )}
                        style={{ width: `${result.rawPredictions?.probabilities[index] * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No raw prediction data available</p>
            )}
          </CardContent>
        </Card>

        {/* XAI Results */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Explainable AI (XAI) Results</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400 mb-4">Key features that influenced the model's prediction:</p>
            <div className="space-y-3">
              {result.xaiResults.features.map((feature, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{feature}</span>
                    <span className="text-sm text-gray-400">
                      {index < result.xaiResults.importance.length
                        ? (result.xaiResults.importance[index] * 100).toFixed(0) + "%"
                        : ""}
                    </span>
                  </div>
                  {index < result.xaiResults.importance.length && (
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={cn("h-2 rounded-full", isTumor ? "bg-red-500" : "bg-green-500")}
                        style={{ width: `${result.xaiResults.importance[index] * 100}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* GPT Analysis */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>GPT Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-sm leading-relaxed text-gray-300">{result.gptResponse}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

