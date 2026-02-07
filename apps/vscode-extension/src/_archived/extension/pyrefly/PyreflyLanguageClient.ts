import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';

export class PyreflyLanguageClient {
  private client: LanguageClient | undefined;
  private outputChannel: vscode.OutputChannel;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('DAD Pyrefly');
  }

  async start(): Promise<void> {
    const config = vscode.workspace.getConfiguration('dad');
    const pyreflyPath = config.get<string>('pyrefly.path') || 'pyrefly';

    const serverOptions: ServerOptions = {
      command: pyreflyPath,
      args: ['lsp'],
      transport: TransportKind.stdio
    };

    const clientOptions: LanguageClientOptions = {
      documentSelector: [
        { scheme: 'file', language: 'python' },
        { scheme: 'untitled', language: 'python' }
      ],
      outputChannel: this.outputChannel
    };

    this.client = new LanguageClient(
      'pyrefly',
      'Pyrefly Language Server',
      serverOptions,
      clientOptions
    );

    this.outputChannel.appendLine('Starting Pyrefly language server...');
    await this.client.start();
    this.outputChannel.appendLine('Pyrefly language server started');
  }

  async stop(): Promise<void> {
    if (this.client) {
      this.outputChannel.appendLine('Stopping Pyrefly language server...');
      await this.client.stop();
      this.outputChannel.appendLine('Pyrefly language server stopped');
    }
  }

  isRunning(): boolean {
    return this.client?.isRunning() ?? false;
  }

  getClient(): LanguageClient | undefined {
    return this.client;
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}
