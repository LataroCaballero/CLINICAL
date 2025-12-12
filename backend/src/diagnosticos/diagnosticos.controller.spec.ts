import { Test, TestingModule } from '@nestjs/testing';
import { DiagnosticosController } from './diagnosticos.controller';
import { DiagnosticosService } from './diagnosticos.service';

describe('DiagnosticosController', () => {
  let controller: DiagnosticosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiagnosticosController],
      providers: [DiagnosticosService],
    }).compile();

    controller = module.get<DiagnosticosController>(DiagnosticosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
