package com.transaction.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class FrontendController {
    @GetMapping("/{path:[^\\.]*}")
    public String forwardToReact() {
        return "forward:/index.html";
    }
}

