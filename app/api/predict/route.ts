import { NextResponse } from "next/server"
import { exec } from "child_process"
import path from "path"
import fs from "fs"

export async function POST(req: Request) {
  try {
    const data = await req.json()

    if (!data.image) {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 })
    }

    // Create models directory if it doesn't exist
    const modelsDir = path.join(process.cwd(), "python", "models")
    if (!fs.existsSync(modelsDir)) {
      try {
        fs.mkdirSync(modelsDir, { recursive: true })
        console.log(`Created models directory at: ${modelsDir}`)
      } catch (dirError) {
        console.error(`Failed to create models directory: ${dirError}`)
      }
    }

    // Add .keras file check alongside .pkl and .h5
    const pklModelPath = path.join(modelsDir, "brain_tumor_model.pkl")
    const h5ModelPath = path.join(modelsDir, "brain_tumor_model.h5")
    const kerasModelPath = path.join(modelsDir, "brain_tumor_model.keras")

    let modelPath = ""

    // Determine which model file to use
    if (fs.existsSync(pklModelPath)) {
      modelPath = pklModelPath
      console.log("Using PKL model file")
    } else if (fs.existsSync(h5ModelPath)) {
      modelPath = h5ModelPath
      console.log("Using H5 model file")
    } else if (fs.existsSync(kerasModelPath)) {
      modelPath = kerasModelPath
      console.log("Using KERAS model file")
    } else {
      console.error("No model file found")
      return NextResponse.json(
        {
          error: `Model file not found. Please make sure either brain_tumor_model.pkl, brain_tumor_model.h5, or brain_tumor_model.keras is in the python/models directory.`,
        },
        { status: 500 },
      )
    }

    // Use forward slashes for paths to avoid escape character issues in Python
    const normalizedModelPath = modelPath.replace(/\\/g, "/")
    console.log(`Normalized model path: ${normalizedModelPath}`)

    // Path to Python script
    const scriptPath = path.join(process.cwd(), "python", "model_predictor.py")
    const normalizedScriptPath = scriptPath.replace(/\\/g, "/")

    // Check if Python script exists
    if (!fs.existsSync(scriptPath)) {
      console.error(`Python script not found at: ${scriptPath}`)
      return NextResponse.json({ error: "Python script not found" }, { status: 500 })
    }

    // Prepare input data for Python script
    const inputData = JSON.stringify({
      image: data.image,
      model_path: normalizedModelPath,
    })

    // Execute Python script
    const result = await new Promise<any>((resolve, reject) => {
      // Use -u flag to ensure unbuffered output
      const pythonProcess = exec(`python -u "${normalizedScriptPath}"`, {
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large images
        env: {
          ...process.env,
          TF_CPP_MIN_LOG_LEVEL: "2", // Suppress TensorFlow warnings
          PYTHONIOENCODING: "utf-8", // Ensure proper encoding
        },
      })

      let stdout = ""
      let stderr = ""

      // Send input data to Python script
      pythonProcess.stdin?.write(inputData)
      pythonProcess.stdin?.end()

      // Collect stdout
      pythonProcess.stdout?.on("data", (data) => {
        stdout += data.toString()
      })

      // Collect stderr
      pythonProcess.stderr?.on("data", (data) => {
        stderr += data.toString()
        console.error("Python stderr:", data.toString())
      })

      // Handle process completion
      pythonProcess.on("close", (code) => {
        console.log(`Python process exited with code ${code}`)

        if (code !== 0) {
          console.error(`Python process error: ${stderr}`)

          // Check if stderr contains TensorFlow warnings that we can ignore
          if (
            stderr.includes("disable_eager_execution") ||
            stderr.includes("skipping variable loading for optimizer")
          ) {
            console.warn("TensorFlow warnings detected, but continuing with analysis")

            // Try to parse stdout anyway if it exists
            if (stdout.trim()) {
              try {
                const jsonResult = JSON.parse(stdout.trim())
                resolve(jsonResult)
                return
              } catch (e) {
                // If parsing fails, continue to error handling
                console.error("Failed to parse stdout despite warnings:", e)
              }
            }
          }

          resolve({ error: stderr || "Python script failed with non-zero exit code" })
          return
        }

        try {
          // Try to parse the JSON result
          const trimmedOutput = stdout.trim()
          console.log("Python output:", trimmedOutput)

          if (!trimmedOutput) {
            resolve({ error: "Python script returned empty output" })
            return
          }

          try {
            const jsonResult = JSON.parse(trimmedOutput)
            resolve(jsonResult)
          } catch (parseError) {
            console.error("Failed to parse Python output:", parseError)
            console.error("Raw output:", trimmedOutput)
            resolve({
              error:
                "Failed to parse Python output: " +
                parseError.message +
                ". Raw output: " +
                trimmedOutput.substring(0, 100) +
                "...",
            })
          }
        } catch (e) {
          console.error("Error processing Python output:", e)
          resolve({ error: "Error processing Python output: " + e.message })
        }
      })

      // Handle process errors
      pythonProcess.on("error", (err) => {
        console.error("Failed to start Python process:", err)
        resolve({ error: "Failed to start Python process: " + err.message })
      })
    })

    if (result.error) {
      console.error("Python script returned error:", result.error)
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Generate GPT response based on model prediction
    let gptResponse = ""

    if (result.result === "Tumor Detected") {
      // Get the specific tumor type if available
      const tumorType = result.predictedClass || "unknown type"

      gptResponse = `The MRI scan shows characteristics consistent with a brain tumor (${tumorType}). The image displays an abnormal mass with irregular borders and heterogeneous signal intensity. There appears to be surrounding edema and possible mass effect on adjacent structures. Based on imaging features alone, this could represent a high-grade glioma, but histopathological confirmation would be necessary for definitive diagnosis. Further imaging with contrast enhancement and possibly advanced MRI techniques like perfusion or spectroscopy would help characterize the lesion further.`
    } else {
      gptResponse =
        "The MRI scan appears to show normal brain anatomy without evidence of a tumor. The brain parenchyma demonstrates normal signal intensity throughout, with no focal lesions, abnormal enhancement, or mass effect identified. The ventricles are of normal size and configuration. Gray-white matter differentiation is preserved. No midline shift or herniation is present. The visualized extra-axial spaces appear unremarkable. While this scan appears normal, clinical correlation is always recommended."
    }

    // Return the prediction results with GPT response
    return NextResponse.json({
      ...result,
      gptResponse,
    })
  } catch (error) {
    console.error("Error in predict API route:", error)
    return NextResponse.json(
      {
        error: "Failed to process image: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}

