package com.transaction.controller;

import com.transaction.model.Position;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Swagger related dependencies had issues in local setup
 * hence created end point without it.
 */
@RestController
@RequestMapping("/api/positions")
@CrossOrigin
//@Tag(name = "Position Management", description = "APIs to receive equity positions")
public class PositionController {

    // TODO : This operation move to create, update, delete end points where updated positions
    //        are saved to the database.
    //@Operation(summary = "Receive position data from frontend")
    //@ApiResponse(responseCode = "200", description = "Positions received successfully")
    @PostMapping
    public ResponseEntity<String> receivePositions(@RequestBody List<Position> positions) {
        // Process/save the received positions
        positions.forEach(System.out::println); // or save to DB
        return ResponseEntity.ok("Positions received");
    }

    // TODO : Add other endpoints specially for
    //  createTransaction: End point , @PostMapping("/transactions")
    //  updateTransaction: End point , @PutMapping("/{transactionId}")
    //  deleteTransaction: End point,  @DeleteMapping("/transactions/{transactionId}")
}
