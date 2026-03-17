// model/associations.js
// =====================================================================
// DynamoDB does NOT need associations like Sequelize.
// Relationships are handled by storing related IDs as attributes
// and performing manual lookups in controllers.
//
// This file is kept as a no-op to avoid breaking existing imports.
// =====================================================================

export default {};
