package com.transaction.service;

import org.apache.lucene.analysis.standard.StandardAnalyzer;
import org.apache.lucene.analysis.tokenattributes.CharTermAttribute;

import java.io.StringReader;
import java.util.*;

public class PayeeMatchService {
    public static double cosineSimilarity(Map<String, Double> vector1, Map<String, Double> vector2) {
        Set<String> words = new HashSet<>(vector1.keySet());
        words.addAll(vector2.keySet());

        double dotProduct = 0.0, magnitude1 = 0.0, magnitude2 = 0.0;
        for (String word : words) {
            double tfidf1 = vector1.getOrDefault(word, 0.0);
            double tfidf2 = vector2.getOrDefault(word, 0.0);
            dotProduct += tfidf1 * tfidf2;
            magnitude1 += Math.pow(tfidf1, 2);
            magnitude2 += Math.pow(tfidf2, 2);
        }
        return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
    }

    public static Map<String, Double> tokenize(String text) throws Exception {
        StandardAnalyzer analyzer = new StandardAnalyzer();
        StringReader reader = new StringReader(text);
        Map<String, Double> termFrequency = new HashMap<>();

        try (var tokenStream = analyzer.tokenStream(null, reader)) {
            tokenStream.reset();
            while (tokenStream.incrementToken()) {
                String term = tokenStream.getAttribute(CharTermAttribute.class).toString();
                termFrequency.put(term, termFrequency.getOrDefault(term, 0.0) + 1);
            }
        }
        return termFrequency;
    }

    public static void main(String[] args) throws Exception {
        List<String> payees = Arrays.asList("Zepto", "Zepto Marketplace Pr", "Zepto NOW", "ZEPTO MARKETPLACE PR", "Amazon Online");
        String targetPayee = "Zepto";

        Map<String, Double> targetVector = tokenize(targetPayee);
        for (String payee : payees) {
            Map<String, Double> payeeVector = tokenize(payee);
            double similarity = cosineSimilarity(targetVector, payeeVector);
            System.out.println("Cosine Similarity between '" + targetPayee + "' and '" + payee + "': " + similarity);
        }
    }


}

