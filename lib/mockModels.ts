export type MockModel = {
  id: string;
  name: string;
  prompt: string;
  description: string;
};

/**
 * Placeholder example-model metadata for the homepage preview and gallery.
 * Replace with real generated models (with modelUrl pointing at NURBS/mesh
 * assets) once the Hunyuan3D + mesh-to-NURBS pipeline is live.
 */
export const mockModels: MockModel[] = [
  {
    id: "vase-01",
    name: "Fluted vase",
    prompt: "a tall fluted ceramic vase with a narrow neck",
    description: "Smooth NURBS surfaces, ideal for showing off curvature fidelity.",
  },
  {
    id: "gear-01",
    name: "Mechanical gear",
    prompt: "a precision spur gear with 24 teeth",
    description: "Sharp edges and repeating features to stress-test the pipeline.",
  },
  {
    id: "chair-01",
    name: "Lounge chair",
    prompt: "a mid-century modern lounge chair",
    description: "Organic and structural surfaces combined in one model.",
  },
  {
    id: "shell-01",
    name: "Seashell",
    prompt: "a spiraled seashell",
    description: "Complex freeform geometry for testing NURBS continuity.",
  },
];
