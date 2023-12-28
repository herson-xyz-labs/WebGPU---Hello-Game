import shaderSource from './shaders/shader.wgsl?raw';
import { QuadGeometry } from './geometry';
import { Texture } from './texture';

class Renderer
{
  private context!: GPUCanvasContext;
  private device!: GPUDevice;
  private pipeline!: GPURenderPipeline;
  private positionBuffer!: GPUBuffer;
  private colorsBuffer!: GPUBuffer;
  private texCoordsBuffer!: GPUBuffer;
  private testTexture!: Texture;
  private textureBindGroup!: GPUBindGroup;

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

    this.testTexture = await Texture.createTextureFromURL(this.device, '/assets/albedo.jpg');
    this.prepareModel();

    const geometry = new QuadGeometry();

    this.positionBuffer = this.createBuffer(new Float32Array(geometry.positions));
    this.colorsBuffer = this.createBuffer(new Float32Array(geometry.colors));
    this.texCoordsBuffer = this.createBuffer(new Float32Array(geometry.texCoords));

  }

  private createBuffer(data: Float32Array) : GPUBuffer
  {
    const buffer = this.device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });

    new Float32Array(buffer.getMappedRange()).set(data);
    buffer.unmap();

    return buffer;
  }

  private prepareModel()
  {
    const shaderModule = this.device.createShaderModule({
      code: shaderSource,
    });

    const positionBufferLayout : GPUVertexBufferLayout = {
      arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT,
      attributes: [
        {
          shaderLocation: 0,
          offset: 0,
          format: 'float32x2',
        }
      ],
      stepMode: 'vertex',
    };

    const colorBufferLayout : GPUVertexBufferLayout = {
      arrayStride: 3 * Float32Array.BYTES_PER_ELEMENT,
      attributes: [
        {
          shaderLocation: 1,
          offset: 0,
          format: 'float32x3',
        }
      ],
      stepMode: 'vertex',
    };

    const texCoordsBufferLayout : GPUVertexBufferLayout = {
      arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT,
      attributes: [
        {
          shaderLocation: 2,
          offset: 0,
          format: 'float32x2',
        }
      ],
      stepMode: 'vertex',
    };

    const vertexState: GPUVertexState = {
      module: shaderModule,
      entryPoint: 'vertexMain',
      buffers: [ positionBufferLayout, colorBufferLayout, texCoordsBufferLayout ],
    };

    const fragmentState: GPUFragmentState = {
      module: shaderModule,
      entryPoint: 'fragmentMain',
      targets: [
        {
          format: navigator.gpu.getPreferredCanvasFormat(),
          blend: {
            color: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
          },
        },
      ],
    };

    const textureBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {},
        },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [textureBindGroupLayout],
    });

    this.textureBindGroup = this.device.createBindGroup({
      layout: textureBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: this.testTexture.sampler,
        },
        {
          binding: 1,
          resource: this.testTexture.texture.createView(),
        },
      ],
    });

    this.pipeline = this.device.createRenderPipeline({
      vertex: vertexState,
      fragment: fragmentState,
      primitive: {
        topology: 'triangle-list'
      },
      layout: pipelineLayout,
    });

  }

  public draw()
  {
    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.8, g: 0.8, b: 0.8, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    passEncoder.setPipeline(this.pipeline);
    passEncoder.setVertexBuffer(0, this.positionBuffer);
    passEncoder.setVertexBuffer(1, this.colorsBuffer);
    passEncoder.setVertexBuffer(2, this.texCoordsBuffer);
    passEncoder.setBindGroup(0, this.textureBindGroup);
    passEncoder.draw(6);
    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }
}

const renderer = new Renderer();
renderer.initialize()
        .then(() => 
          renderer.draw()
        );