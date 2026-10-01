/* ──────────────────────────────────────────────────────────────────────
   PROJECTS
   Edit this list to add, remove or reorder projects. Newest first.

   Each entry:
     title     – short project name
     org       – who it was for (employer; client names are not published)
     period    – free text, e.g. "2022 – 2025"
     summary   – one or two sentences on what it did and why it mattered
     tags      – 3–5 technologies or methods
     figure    – a drawing from js/figures.js: "twin" | "drone" | "floors" |
                 "cloud" | "proximity" | "cargo", OR an image path such as
                 "assets/projects/my-map.jpg" to use your own screenshot
     href      – link to a case study, repo or demo ("" for none)
     example   – optional; true shows an EXAMPLE chip for an invented entry
     featured  – optional. Cards 1, 4 and 6 of every six span two columns
                 automatically; set true to force a wide card or false to
                 force a single-column one
   ────────────────────────────────────────────────────────────────────── */

window.PROJECTS = [
  {
    title: "Estate digital twins",
    org: "Ridge and Partners LLP",
    period: "2025 – present",
    summary: "Interactive 2D and 3D estate experiences that unite drone, survey, BIM and asset data in a single view across healthcare, higher education and housing, including the Revit georeferencing fix that lands models correctly on the British National Grid.",
    tags: ["BIM to GIS", "Drone imagery", "British National Grid", "ArcGIS Online"],
    figure: "twin",
    href: "case-studies/estate-digital-twins.html"
  },
  {
    title: "Drone condition survey mapping",
    org: "Ridge and Partners LLP",
    period: "2025 – present",
    summary: "The ArcGIS orthomosaic, 3D scene and defect mapping deliverable on drone condition surveys, built with the Geospatial and Building Surveying teams.",
    tags: ["Drone imagery", "Orthomosaics", "3D scenes", "Defect mapping"],
    figure: "drone",
    href: "case-studies/drone-condition-surveys.html"
  },
  {
    title: "Web and mobile GIS applications",
    org: "Ridge and Partners LLP",
    period: "2025 – present",
    summary: "Experience Builder web applications with bespoke functionality, Survey123 and Field Maps mobile applications, and floor-aware mapping for capacity management.",
    tags: ["Experience Builder", "Survey123", "Field Maps", "Arcade"],
    figure: "floors",
    href: "case-studies/web-and-mobile-gis.html"
  },
  {
    title: "ArcGIS Enterprise on AWS, with AI built in",
    org: "Amazon",
    period: "2023 – 2025",
    summary: "Migrated the programme's GIS infrastructure from ArcGIS Online to ArcGIS Enterprise on AWS, replaced multiple legacy solutions for more than £2m in savings, and shipped AI features on Bedrock and SageMaker.",
    tags: ["ArcGIS Enterprise", "AWS", "Bedrock", "SageMaker"],
    figure: "cloud",
    href: "case-studies/arcgis-enterprise-on-aws.html"
  },
  {
    title: "Standing up a GIS programme",
    org: "Amazon",
    period: "2022 – 2023",
    summary: "Built a new GIS programme from the ground up: strategy and roadmap, buy-in across Corporate Security, and an ArcGIS Online environment with its budget, licensing and governance.",
    tags: ["ArcGIS Online", "Governance", "Strategy", "Budget and licensing"],
    figure: "proximity",
    href: "case-studies/standing-up-a-gis-programme.html"
  },
  {
    title: "Real-time incident management dashboards",
    org: "Amazon",
    period: "2017 – 2020",
    summary: "Dashboards, analytical frameworks and automated monitoring that improved response times during critical events and surfaced vulnerabilities across Amazon facilities.",
    tags: ["Dashboards", "Statistical modelling", "Geospatial analysis", "R"],
    figure: "cargo",
    href: "case-studies/incident-management-dashboards.html"
  }
];
