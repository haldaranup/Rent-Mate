import { Request } from 'express'; // Import Request from express
import { User } from '../../users/entities/user.entity'; // Adjust path as needed

export interface AuthenticatedRequestWithUser extends Request {
  user: User;
} 