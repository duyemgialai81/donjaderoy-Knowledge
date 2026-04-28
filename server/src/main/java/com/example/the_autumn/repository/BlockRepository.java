package com.example.the_autumn.repository;

import com.example.the_autumn.entity.Block;
import com.example.the_autumn.entity.BlockId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BlockRepository extends JpaRepository<Block, BlockId> {
    List<Block> findByBlockerId(String blockerId);
    boolean existsByBlockerIdAndBlockedId(String blockerId, String blockedId);
}