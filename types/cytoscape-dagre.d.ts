declare module "cytoscape-dagre" {
  const register: (cy: typeof import("cytoscape")) => void;
  export default register;
}
