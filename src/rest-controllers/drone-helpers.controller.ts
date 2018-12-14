import { injectable } from 'inversify';
import { Request, Response } from 'express';
import { enumToObject } from '../services/util.service';
import { DroneStatus } from '../models/drones.model';
import { DronePriceActionType } from '../models/drone-prices.model';

@injectable()
export class DroneHelpersController {
  constructor() {
    return {
      getDroneStatuses(req: Request, res: Response) {
        res.json(enumToObject(DroneStatus as any));
      },

      getDronePriceActionTypes(req: Request, res: Response) {
        res.json(enumToObject(DronePriceActionType as any));
      },
    };
  }
}