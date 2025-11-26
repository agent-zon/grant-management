package sample.spring.security.mt.sms.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import lombok.experimental.FieldDefaults;
import sample.spring.security.mt.sms.dto.Application;
import sample.spring.security.mt.sms.dto.ServiceInstance;
import sample.spring.security.mt.sms.dto.Subscriber;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Builder
public class Subscription {
   Subscriber subscriber;
   Application rootApplication;
   Application self;
   int subscriptionsCount;
   List<ServiceInstance> serviceInstances;
}