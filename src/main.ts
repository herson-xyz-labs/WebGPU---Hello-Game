class Renderer
{
  private context!: GPUCanvasContext;
  private device!: GPUDevice;

  public async initialize()
  {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.context = canvas.getContext('webgpu')!;

    if(!this.context){
      console.log('WebGPU not supported');
      return;
    }

    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'low-power',
    });

    if (!adapter) {
      console.log('No adapter found');
      return;
    }

    this.device = await adapter.requestDevice();

    this.context.configure({
      device: this.device,
      format: navigator.gpu.getPreferredCanvasFormat(),
    });

  }

  public logDeviceInfo()
  {
    console.log(this.device);
  }

  public draw()
  {

  }
}

const renderer = new Renderer();
renderer.initialize()
        .then(() => 
          renderer.logDeviceInfo()
        );