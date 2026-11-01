#  Sistema de Gestión Bibliotecaria y Catálogo Web — Librería & Centro Cultural Minerva, C.A.

Sistema integral full-stack compuesto por una **Plataforma Interna de Gestión y Punto de Venta (POS)** y un **Catálogo Web Público en línea**, diseñado para la administración de inventario, facturación con IVA (16%) en divisas (`$`) y Bolívares (`Bs.` a tasa BCV), seguridad de doble factor (2FA con Google Authenticator), auditoría en tiempo real, respaldo/restauración de base de datos y emisión de 9 reportes ejecutivos en PDF.

---

##  Identidad Institucional
* **Empresa:** Librería & Centro Cultural Minerva, C.A.
* **Slogan:** *"Espacio del Conocimiento y la Sabiduría"*
* **R.I.F.:** J-40192837-0
* **Ubicación:** Centro Comercial Arca, Barquisimeto, Estado Lara.

---

##  Tecnologías Utilizadas

### Frontend (Sistema de Gestión y Web Pública):
* **React 18 / 19** + **Vite**
* **CSS Paged Media (`@page` y `@media print`)** para generación de reportes PDF vectoriales nativos y gráficas estadísticas (Pastel y Barras Comparativas)
* **HTML5 & CSS3** (Diseño responsivo y arquitectura modular por componentes)

### Backend & Base de Datos:
* **Node.js** con **Express.js**
* **SQLite 3 (`dev.db`)** (Base de datos relacional portable y transaccional)
* **Prisma ORM** (Modelado y consultas relacionales tipadas)
* **Seguridad Multicapa:**
  * **JWT (JSON Web Tokens)** + **Bcrypt.js** para cifrado de credenciales y control de roles (`admin` / `staff`).
  * **Doble Factor de Autenticación (2FA - TOTP RFC 6238)** compatible con **Google Authenticator** 100% local (sin requerir internet) con generador propio de códigos QR en SVG.
  * **Protección Anti-Intrusión (Lockout):** Bloqueo temporal automático de 10 minutos tras 3 intentos fallidos consecutivos, con alerta en la Bitácora.

---

##  Estructura del Proyecto

```text
sistema-biblioteca-minerva/
├── backend-biblioteca/          # API REST Node/Express, Prisma ORM, motor TOTP 2FA y SQLite (Puerto 4000)
├── frontend-biblioteca/         # Sistema Administrativo y Punto de Venta POS (Puerto 5173)
├── web-publica-minerva/         # Página Web Pública de Catálogo para Clientes (Puerto 5174)
├── iniciar-sistema.bat          # Script para iniciar todos los servidores en 1 clic
├── iniciar-web-publica.bat      # Script para iniciar el catálogo público
└── README.md
```

---

##  Instalación 

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/sistema-biblioteca-minerva.git
cd sistema-biblioteca-minerva
```

### 2. Configurar el Backend (`Puerto 4000`)
```bash
cd backend-biblioteca
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
```

### 3. Configurar el Sistema de Gestión (`Puerto 5173`)
```bash
cd ../frontend-biblioteca
npm install
```

### 4. Configurar la Web Pública (`Puerto 5174`)
```bash
cd ../web-publica-minerva
npm install
```

### 5. Encendido Rápido (Windows)
Haz doble clic en **`iniciar-sistema.bat`** en la raíz del proyecto para levantar automáticamente el Backend (`4000`), el Sistema de Gestión (`5173`) y la Web Pública (`5174`).

---

##  Módulos Principales

1. **Autenticación de Doble Factor (2FA) y Control de Acceso:**
   * Inicio de sesión en 2 pasos con **Google Authenticator** (código QR único por trabajador y códigos temporales de 6 dígitos cada 30 segundos).
   * Bloqueo automático por intentos fallidos y desbloqueo administrativo.
2. **Punto de Venta (POS) con IVA (16%):**
   * Facturación desglosando **Base Imponible**, **IVA (16%)** y **Total a Pagar** tanto en Dólares (`$`) como en Bolívares (`Bs.`) sincronizados con la tasa oficial BCV.
   * Selector rápido de cédula Venezolana (`V-`) o Extranjera (`E-`).
3. **Catálogo de Libros y Control de Inventario:**
   * Gestión de existencias, precios base + IVA, entradas de compras a distribuidores y descargos por mermas/bajas.
4. **Gestión de Lectores y Personal:**
   * Registro de lectores y trabajadores con validación de cédula (`V-`/`E-`), fecha de nacimiento con cálculo automático de edad, historial de compras y administración de códigos QR 2FA.
5. **Bitácora, Seguridad y Respaldo / Restauración de Base de Datos:**
   * Auditoría inmutable de eventos, monitoreo de sesiones activas en tiempo real, descarga de copias de seguridad (`.db` y `.json`) y **carga/restauración directa de backups** desde la interfaz.
6. **Centro de 9 Reportes Oficiales en PDF (Exclusivo Administrador):**
   * *Operativos:* Arqueo de Caja e Ingresos, Alerta de Stock Crítico, Catálogo General por Género.
   * *Gerenciales:* Rentabilidad y Margen de Ganancia, Libros Más Vendidos (con gráficas de Pastel y Barras Comparativas), Balance de Compras a Proveedores.
   * *Supervisión:* Auditoría de Mermas, Rendimiento de Personal, Trazabilidad de Accesos.
7. **Catálogo Web Público (`web-publica-minerva`):**
   * Portal de consulta para clientes con buscador en vivo, precios con IVA en `$` y `Bs.`, ubicación en Google Maps (C.C. Arca, Barquisimeto) y atención directa vía WhatsApp.

---

##  Credenciales de Acceso por Defecto (Base de Datos Inicial)

Cuando el sistema se ejecuta por primera vez en una computadora nueva (o al ejecutar `npm run prisma:seed`), se genera automáticamente la base de datos inicial con las siguientes credenciales de prueba:

| Rol | Nombre | Correo Electrónico | Cédula | Contraseña |
| :--- | :--- | :--- | :--- | :--- |
| **Administrador** | Jheisel Parra | `admin@biblioteca.com` | `V-24123456` | `admin123` |
| **Personal (Staff)** | Carlos Mendoza | `carlos@biblioteca.com` | `V-26890123` | `staff123` |

> **Nota sobre Google Authenticator (2FA):** En una base de datos recién creada, al ingresar por primera vez con cualquiera de estos usuarios, el sistema mostrará automáticamente en pantalla su **Código QR de configuración inicial** para vincularlo con la aplicación **Google Authenticator**. Una vez dentro del panel de **Bitácora y Seguridad**, el Administrador también puede subir y restaurar cualquier backup `.db` o `.json` previamente descargado.
