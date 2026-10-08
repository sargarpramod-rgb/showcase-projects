package com.transaction.service;

public interface AutoCategorizer {

    /***
     *
     *   accept CategorizationContext
     *              --> Transaction transactionInput
     *              --> UserCategorizationData userCategorizationData
     *
     *   UserCategorizationData
     *              --> user_id
     *              --> Map<String, PayeeCategoryMapping> payeeCategoryMapping
     *              --> Transaction historicalTransaction
     *
     *   CategorySuggestion
     *        --> categoryId
     *        --> subCategoryId
     *        --> Confidence
     *        --> CategorySource
     *
     *   CategorySource
     *        --> PAYEE_MAPPING
     *        --> RECURRING
     *        --> ML
     *
     *   Method should take CategorizationContext and return Optional<CategorySuggestion>
     *
     *       --> optional<CategorySuggestion> autoCategorise(CategorizationContext categorizationContext)
     *
     */

}
