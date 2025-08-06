# Acortador de URL con AWS CDK

Este proyecto implementa una infraestructura para un servicio de mensajes (estilo twitter) utilizando AWS CDK . ECS Fargate, DynamoDB, ECR, Cloudwatch, etc.

## Requisitos previos
- Node.js y npm
- AWS CLI configurado (`aws configure`)

## Instalación

   npm install


## Despliegue de la infraestructura
1.
   npm run build
   npx cdk deploy

## Variables de entorno
El servicio utiliza variables de entorno para su configuración, incluyendo:
- `ENV`: Nombre del entorno (dev, prod, etc.)
- `LOG_LEVEL`: Nivel de logs
- `TTL_DAYS`: ttl de los registros de ddb
- `DDB_TABLE_{Table}`: Nombre de las tablas de ddb (auto generado)
- `BASE_URL`: URL base del servicio (DNS del Load Balancer) + El path del endpoint de para resolver la url generada
- `PORT`: Puerto de la aplicación (80 por defecto)

Estas variables se inyectan al ambiente donde se ejecuta el servicio .

## Estructura del proyecto
- `lib/`: stacks de cloudformation
- `app.ts`: archivo main del proyecto

## Despliegue
- El pipeline de CI/CD está configurado para desplegar automáticamente nuevas imágenes desde ECR al last tareas del cluster de ECS.
