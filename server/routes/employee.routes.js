import express from 'express';
import { createEmployee, deleteEmployee, getEmployeeById, getEmployees, updateEmployee } from '../controllers/employee.controller.js';
import { verifyJWT } from '../middleware/verifyJWT.js';

const router = express.Router();

router.post('/', verifyJWT, createEmployee); // POST /api/employees
router.get('/', verifyJWT, getEmployees)     // GET    /api/employees
router.get('/:id', verifyJWT, getEmployeeById)  // GET    /api/employees/id
router.put('/:id', verifyJWT, updateEmployee);
router.delete('/:id', verifyJWT, deleteEmployee);

export default router;