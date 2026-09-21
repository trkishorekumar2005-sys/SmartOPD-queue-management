CREATE DATABASE IF NOT EXISTS smartopd;
USE smartopd;

CREATE TABLE hospitals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  city VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) NOT NULL,
  average_service_minutes INT NOT NULL DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_departments_hospital
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  CONSTRAINT unique_department_per_hospital UNIQUE (hospital_id, name),
  CONSTRAINT unique_department_code_per_hospital UNIQUE (hospital_id, code)
);

CREATE TABLE doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id INT NOT NULL,
  department_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  room_number VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_doctors_hospital
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  CONSTRAINT fk_doctors_department
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id INT NOT NULL,
  department_id INT NULL,
  employee_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'RECEPTIONIST',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_staff_hospital
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  CONSTRAINT fk_staff_department
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  age TINYINT UNSIGNED NOT NULL,
  gender ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  department_id INT NOT NULL,
  doctor_id INT NULL,
  token_number VARCHAR(30) NOT NULL,
  status ENUM('WAITING', 'SERVING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'WAITING',
  called_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tokens_patient
    FOREIGN KEY (patient_id) REFERENCES patients(id),
  CONSTRAINT fk_tokens_department
    FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT fk_tokens_doctor
    FOREIGN KEY (doctor_id) REFERENCES doctors(id),
  CONSTRAINT unique_token_per_department UNIQUE (department_id, token_number),
  INDEX idx_tokens_department_status_created (department_id, status, created_at)
);

INSERT INTO hospitals (name, city)
VALUES ('Vought+ Hospital', 'Chennai');

INSERT INTO departments (hospital_id, name, code, average_service_minutes)
VALUES
  (1, 'General Medicine', 'GM', 10),
  (1, 'Cardiology', 'CAR', 15);

INSERT INTO doctors (hospital_id, department_id, name, room_number)
VALUES
  (1, 1, 'Dr Kumar', '204'),
  (1, 2, 'Dr Mehta', '305');

-- Demo password for employee ID STAFF001: staff123
INSERT INTO staff (hospital_id, department_id, employee_id, name, password_hash, role)
VALUES
  (1, 1, 'STAFF001', 'Anita Receptionist', '$2b$10$aVhljEcV0xfAVC4R8wUncu000xMS6Kcvd1ZCTvmTanUdNt5klsadO', 'RECEPTIONIST');
