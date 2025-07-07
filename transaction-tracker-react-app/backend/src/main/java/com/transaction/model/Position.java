package com.transaction.model;

public class Position {
    private String securityCode;
    private int netQuantity;

    public String getSecurityCode() {
        return securityCode;
    }

    public void setSecurityCode(String securityCode) {
        this.securityCode = securityCode;
    }

    public int getNetQuantity() {
        return netQuantity;
    }

    public void setNetQuantity(int netQuantity) {
        this.netQuantity = netQuantity;
    }

    @Override
    public String toString() {
        return "Position{" +
                "securityCode='" + securityCode + '\'' +
                ", netQuantity=" + netQuantity +
                '}';
    }

    // Getters and setters
}
