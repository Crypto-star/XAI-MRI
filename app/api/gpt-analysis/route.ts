import { NextResponse } from "next/server"
import { exec } from "child_process"
import path from "path"
import fs from "fs"

export async function POST(req: Request) {
  try {
    const data = await req.json()
    
    if (!data.image || !data.modelResults) {
      return NextResponse.json({ error: "Missing image or model results" }, { status: 400 })
    }

    // Get OpenAI API key from environment variable
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key is not configured" }, { status: 500 })
    }

    // Path to Python script
    const scriptPath = path.join(process.cwd(), "python", "gpt_analysis.py")
    const normalizedScriptPath = scriptPath.replace(/\\/g, "/")

    // Check if Python script exists
    if (!fs.existsSync(scriptPath)) {
      console.error(`Python script not found at: ${scriptPath}`)
      return NextResponse.json({ error: "GPT analysis script not found" }, { status: 500 })
    }

    // Prepare input data for Python script
    const inputData = JSON.stringify({
      image: data.image,
      modelResults: data.modelResults,
      api_key: apiKey
    })

    // Execute Python script
    const result = await new Promise<any>((resolve, reject) => {
      // Use -u flag to ensure unbuffered output
      const pythonProcess = exec(`python -u "${normalizedScriptPath}"`, {
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large images
        env: {
          ...process.env,
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
        console.log(`Python GPT analysis process exited with code ${code}`)

        if (code !== 0) {
          console.error(`Python process error: ${stderr}`)
          resolve({ error: stderr || "GPT analysis script failed with non-zero exit code" })
          return
        }

        try {
          // Try to parse the JSON result
          const trimmedOutput = stdout.trim()
          console.log("GPT analysis output:", trimmedOutput)

          if (!trimmedOutput) {
            resolve({ error: "GPT analysis script returned empty output" })
            return
          }

          try {
            const jsonResult = JSON.parse(trimmedOutput)
            resolve(jsonResult)
          } catch (parseError) {
            console.error("Failed to parse GPT analysis output:", parseError)
            console.error("Raw output:", trimmedOutput)
            resolve({
              error: "Failed to parse GPT analysis output: " + parseError.message
            })
          }
        } catch (e) {
          console.error("Error processing GPT analysis output:", e)
          resolve({ error: "Error processing GPT analysis output: " + e.message })
        }
      })

      // Handle process errors
      pythonProcess.on("error", (err) => {
        console.error("Failed to start Python process:", err)
        resolve({ error: "Failed to start Python process: " + err.message })
      })
    })

    if (result.error) {
      console.error("GPT analysis script returned error:", result.error)
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Return the analysis
    return NextResponse.json({
      analysis: result.analysis || "No analysis was generated."
    })
  } catch (error) {
    console.error("Error in GPT analysis API route:", error)
    return NextResponse.json(
      { error: "Failed to generate GPT analysis: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}