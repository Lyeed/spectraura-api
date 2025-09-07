import express from "express";
import cors from "cors";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(
    cors({
        origin: process.env.APP_ORIGIN,
    })
);

app.post("/visualizer", async (req, res) => {
    const { prompt, code } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: "Invalid format" });
    }

    try {
        const content = [];

        if (code) {
            content.push(`JavaScript Code provided by user:\n${code}`);
        }

        content.push(`User prompt:\n${prompt}`);

        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-goog-api-key": process.env.GOOGLE_GEMINI_API_KEY,
                },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [
                            {
                                text: "You are an AI assistant helping to write JavaScript code that create music's visualizations in a canvas.",
                            },
                        ],
                    },
                    contents: {
                        parts: content.map((p) => ({
                            text: p,
                        })),
                    },
                    generationConfig: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: "OBJECT",
                            properties: {
                                code: {
                                    type: "STRING",
                                    description: `
/**
 * @param {Readonly<Uint8Array>} freq - Frequency data array (0–255 values) representing the FFT spectrum of the current audio frame.
 * @param {Readonly<Uint8Array>} time - Time-domain data array (0–255 values) representing the raw waveform of the current audio frame.
 * @param {CanvasRenderingContext2D} canvasContext - 2D canvas context where the visualization is drawn.
 * @param {Record<string, unknown>} object - Internal state, persistent between tick() calls. Can be freely used.
 * @param {{
 *   readonly width: number,
 *   readonly height: number,
 *   readonly deltaTime: number,
 *   readonly currentTime: number,
 *   readonly sampleRate: number
 * }} metadata
 */
function tick(freq, time, canvasContext, obj, metadata) {
    // CODE
    // Constraints: no globals, no async, no DOM. Efficient, no unnecessary allocations. Code must be clean, lisible and not on 1 line.
}`
                                },
                                answer: {
                                    type: "STRING",
                                    description: "Textual answer such as in a conversation. Your personality is a Ghost vibing on music rendering but don't overplay it. Plain text only."
                                },
                            },
                        },
                    },
                }),
            }
        );

        if (!response.ok) {
            console.error(response);
            throw new Error("Request error");
        }

        const json = await response.json();

        const text = json.candidates?.[0]?.content?.parts[0]?.text;
        if (!text) {
            console.error(json);
            throw new Error("Response format error");
        }

        const data = JSON.parse(text);

        return res.send({
            code: data.code,
            message: data.answer,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Error when requesting model" });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

export default app;
