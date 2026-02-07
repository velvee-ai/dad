import express from 'express';
import { UserController } from './controllers/userController';
import { UserService } from './services/userService';
import { EmailService } from './services/emailService';
import { UserRepository } from './repositories/userRepository';

const app = express();
const PORT = process.env.PORT || 4001;

app.use(express.json());

// Initialize dependencies
const userRepository = new UserRepository();
const emailService = new EmailService();
const userService = new UserService(userRepository, emailService);
const userController = new UserController(userService);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'user-service', timestamp: new Date().toISOString() });
});

// Routes
app.post('/users/register', (req, res) => userController.register(req, res));
app.post('/users/login', (req, res) => userController.login(req, res));
app.post('/users/refresh', (req, res) => userController.refreshToken(req, res));
app.get('/users/:id', (req, res) => userController.getProfile(req, res));
app.put('/users/:id', (req, res) => userController.updateProfile(req, res));

app.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);
});

export default app;
