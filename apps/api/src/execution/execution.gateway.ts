import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/execution',
  cors: {
    origin: '*',
  },
})
export class ExecutionGateway {
  private readonly logger = new Logger(ExecutionGateway.name);

  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @MessageBody() data: { executionId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    if (data && data.executionId) {
      client.join(data.executionId);
      this.logger.log(`Client ${client.id} joined room: ${data.executionId}`);
    }
  }

  emitLogLine(executionId: string, stream: 'stdout' | 'stderr', text: string): void {
    this.server.to(executionId).emit('log-line', { executionId, stream, text });
  }

  emitExecutionComplete(executionId: string, result: any): void {
    this.server.to(executionId).emit('execution-complete', result);
  }

  emitExecutionError(executionId: string, message: string): void {
    this.server.to(executionId).emit('execution-error', { executionId, message });
  }

  emitStepProgress(executionId: string, action: string, status: 'running' | 'retrying' | 'done' | 'failed'): void {
    this.server.to(executionId).emit('step-progress', { executionId, action, status });
  }
}
