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

  public draw()
  {
    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 1.0, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }
}

const renderer = new Renderer();
renderer.initialize()
        .then(() => 
          renderer.draw()
        );