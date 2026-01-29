# Proceso de Desarrollo - Instagram List Comparator

## 2026-01-29 16:20 - Creación inicial del proyecto

### Sinopsis
Desarrollo completo de una aplicación web vanilla (HTML/CSS/JS) para comparar listas de seguidores y seguidos de Instagram, identificando mutuos, solo seguidores y solo siguiendo.

### Contexto
El usuario solicitó una herramienta que:
1. Acepte un @ de Instagram público
2. Haga scraping automático de seguidores/seguidos
3. Muestre resultados con loader animado
4. Permita exportar datos en formato JSON
5. **Restricción importante**: NO usar React ni frameworks, solo HTML/CSS/JS vanilla

### Decisiones de Diseño

#### Estética
- **Estilo Brutalista**: Diseño minimalista con bordes gruesos, sin border-radius
- **Tipografía**: Space Mono (monoespaciada) para mantener consistencia con la estética técnica
- **Colores**: Paleta de alto contraste (negro/blanco) con acento verde neón (#00ff88)
- **Sombras**: Box-shadows "brutales" (8px 8px 0px 0px) para efecto 3D plano

#### Arquitectura
- **Estructura modular**: Separación clara entre HTML (estructura), CSS (presentación) y JS (lógica)
- **Estado centralizado**: Variable `currentData` que mantiene los datos actuales
- **Navegación por pantallas**: Sistema de show/hide para transiciones entre input → loader → results

#### Funcionalidad

**1. Scraping de Instagram**
- Intento de usar la API no oficial de Instagram (`/api/v1/users/web_profile_info/`)
- Headers personalizados para simular navegador
- Manejo de errores CORS (Instagram bloquea requests directos)

**2. Comparación de Listas**
- Uso de Sets para optimizar búsquedas
- Algoritmo de comparación:
  - Mutuos: usuarios en ambas listas
  - Solo seguidores: en followers pero no en following
  - Solo siguiendo: en following pero no en followers

**3. Exportación JSON**
- Generación de blob con datos completos
- Descarga automática con nombre personalizado

### Estructura de Archivos

```
igChecker/
├── index.html      # Estructura HTML con 3 pantallas (input, loader, results)
├── styles.css      # Estilos brutalistas con variables CSS
├── script.js       # Lógica de la aplicación (modular y comentada)
├── README.md       # Documentación del proyecto
└── manus/
    └── proceso.md  # Este archivo
```

### Limitaciones Conocidas

1. **CORS de Instagram**: Instagram bloquea requests directos desde navegadores
   - Solución temporal: Mensaje de error informativo
   - Solución futura: Implementar proxy o extensión de navegador

2. **Paginación**: La API de Instagram pagina los resultados
   - Implementación actual: Solo obtiene la primera página
   - Mejora futura: Implementar scroll infinito para obtener todos los datos

### Próximos Pasos Sugeridos

1. **Implementar proxy server**: Para evitar limitaciones CORS
2. **Añadir modo manual**: Permitir pegar listas manualmente como fallback
3. **Mejorar loader**: Animación más elaborada con progreso
4. **Añadir filtros**: Búsqueda dentro de las listas de resultados
5. **Estadísticas visuales**: Gráficos de distribución de seguidores

### Tecnologías Utilizadas

- HTML5 (semántico)
- CSS3 (variables, flexbox, grid)
- JavaScript ES6+ (async/await, fetch API, Sets)
- Git + GitHub CLI

### Comandos Ejecutados

```bash
mkdir -p /home/ubuntu/igChecker
cd /home/ubuntu/igChecker
git init
git add .
git commit -m "Initial commit: Instagram List Comparator - Vanilla HTML/CSS/JS"
gh repo create igChecker --public --source=. --remote=origin --push
```

### Repositorio

🔗 https://github.com/meowrhino/igChecker

---

**Nota importante para futuras iteraciones**: El usuario **NO quiere React** a menos que lo especifique explícitamente. Siempre usar HTML/CSS/JS vanilla por defecto.
